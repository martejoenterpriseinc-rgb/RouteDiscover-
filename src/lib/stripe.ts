import "server-only";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { getDb, schema } from "@/db";
import type { SubscriptionStatus, User } from "@/db/schema";
import { track } from "./events";
import { getLiveSettings, patchLiveAndDraft, type AppSettings } from "./settings";

export async function getStripe(settings?: AppSettings): Promise<Stripe | null> {
  const s = settings ?? (await getLiveSettings());
  const key = s.integrations.stripe.secretKey;
  if (!key) return null;
  return new Stripe(key, { appInfo: { name: "RouteDiscover" } });
}

/**
 * Make sure Stripe has a Product + recurring monthly Price matching the owner's
 * pricing settings. A changed amount creates a new Price (Stripe prices are
 * immutable) and archives the old one. Returns the ids, which are stored in
 * both draft and live settings.
 */
export async function syncStripePrice(): Promise<{ productId: string; priceId: string; created: boolean }> {
  const s = await getLiveSettings();
  const stripe = await getStripe(s);
  if (!stripe) throw new Error("Stripe secret key is not configured.");
  const { monthlyPriceCents, currency } = s.pricing;
  let productId = s.pricing.stripeProductId;
  if (productId) {
    const existing = await stripe.products.retrieve(productId).catch(() => null);
    if (!existing || existing.deleted) productId = "";
  }
  if (!productId) {
    const product = await stripe.products.create({ name: `${s.app.name} monthly`, description: s.app.tagline });
    productId = product.id;
  }
  let priceId = s.pricing.stripePriceId;
  let created = false;
  if (priceId) {
    const existing = await stripe.prices.retrieve(priceId).catch(() => null);
    const matches =
      existing &&
      existing.active &&
      existing.unit_amount === monthlyPriceCents &&
      existing.currency === currency.toLowerCase() &&
      existing.recurring?.interval === "month" &&
      existing.product === productId;
    if (!matches) {
      if (existing?.active) await stripe.prices.update(priceId, { active: false }).catch(() => null);
      priceId = "";
    }
  }
  if (!priceId) {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: monthlyPriceCents,
      currency: currency.toLowerCase(),
      recurring: { interval: "month" },
    });
    priceId = price.id;
    created = true;
  }
  await patchLiveAndDraft({ pricing: { stripeProductId: productId, stripePriceId: priceId } });
  return { productId, priceId, created };
}

export async function ensureCustomer(stripe: Stripe, user: User): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({ email: user.email, name: user.name || undefined, metadata: { userId: user.id } });
  const db = await getDb();
  await db.update(schema.users).set({ stripeCustomerId: customer.id }).where(eq(schema.users.id, user.id));
  return customer.id;
}

export async function createCheckoutSession(user: User, origin: string): Promise<string> {
  const s = await getLiveSettings();
  const stripe = await getStripe(s);
  if (!stripe || !s.pricing.stripePriceId) throw new Error("Billing is not set up yet.");
  const customer = await ensureCustomer(stripe, user);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: s.pricing.stripePriceId, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { userId: user.id },
      ...(s.pricing.trialDays > 0 ? { trial_period_days: s.pricing.trialDays } : {}),
    },
    success_url: `${origin}/app/subscribe?checkout=success`,
    cancel_url: `${origin}/app/subscribe?checkout=canceled`,
  });
  await track("checkout_started", { userId: user.id });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

export async function createPortalSession(user: User, origin: string): Promise<string> {
  const stripe = await getStripe();
  if (!stripe) throw new Error("Billing is not set up yet.");
  const customer = await ensureCustomer(stripe, user);
  const session = await stripe.billingPortal.sessions.create({ customer, return_url: `${origin}/app/account` });
  return session.url;
}

/* ------------------------------------------------------------------ */
/* Webhooks                                                            */
/* ------------------------------------------------------------------ */

type SubLike = {
  id: string;
  customer: string | { id: string };
  status: string;
  items?: { data?: Array<{ price?: { id?: string } | null; current_period_end?: number | null }> };
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
  canceled_at?: number | null;
  metadata?: Record<string, string> | null;
};

async function userIdForSubscription(sub: SubLike): Promise<string | null> {
  if (sub.metadata?.userId) return sub.metadata.userId;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const db = await getDb();
  const user = await db.query.users.findFirst({ where: eq(schema.users.stripeCustomerId, customerId) });
  return user?.id ?? null;
}

/** Upsert our subscription row from a Stripe subscription object. Returns the stored status. */
export async function applySubscription(sub: SubLike): Promise<SubscriptionStatus | null> {
  const userId = await userIdForSubscription(sub);
  if (!userId) return null;
  const db = await getDb();
  const status = sub.status as SubscriptionStatus;
  const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
  const existing = await db.query.subscriptions.findFirst({ where: eq(schema.subscriptions.stripeSubscriptionId, sub.id) });
  const values = {
    userId,
    stripeSubscriptionId: sub.id,
    stripePriceId: sub.items?.data?.[0]?.price?.id ?? null,
    status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    updatedAt: new Date(),
  };
  await db
    .insert(schema.subscriptions)
    .values(values)
    .onConflictDoUpdate({ target: schema.subscriptions.stripeSubscriptionId, set: values });
  const wasActive = existing && ["active", "trialing", "past_due"].includes(existing.status);
  const isActive = ["active", "trialing", "past_due"].includes(status);
  if (!existing && isActive) await track("subscription_started", { userId, meta: { status } });
  else if (existing && !wasActive && isActive) await track("subscription_started", { userId, meta: { status, reactivated: true } });
  if (wasActive && !isActive) await track("subscription_canceled", { userId, meta: { status } });
  return status;
}

/** Route a verified Stripe event to the right handler. Exported for tests. */
export async function handleStripeEvent(event: { type: string; data: { object: unknown } }): Promise<string> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const status = await applySubscription(event.data.object as SubLike);
      return status ? `subscription ${status}` : "subscription ignored (unknown customer)";
    }
    case "checkout.session.completed": {
      const session = event.data.object as { subscription?: string | null; customer?: string | null };
      if (session.subscription) {
        const stripe = await getStripe();
        if (stripe) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await applySubscription(sub as unknown as SubLike);
          return "checkout applied";
        }
      }
      return "checkout noted";
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as { customer?: string | null };
      if (inv.customer) {
        const db = await getDb();
        const user = await db.query.users.findFirst({ where: eq(schema.users.stripeCustomerId, inv.customer) });
        if (user) await track("subscription_payment_failed", { userId: user.id });
      }
      return "payment failure noted";
    }
    default:
      return "ignored";
  }
}
