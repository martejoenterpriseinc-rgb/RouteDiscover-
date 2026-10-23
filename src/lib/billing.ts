import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Subscription, User } from "@/db/schema";
import { track } from "./events";
import { getLiveSettings } from "./settings";

export type Access = {
  /** May use the app's features. */
  allowed: boolean;
  /** Why not, when not allowed. */
  reason: "none" | "no_subscription" | "subscription_inactive" | "expired";
  status: Subscription["status"] | "none";
  kind: Subscription["kind"] | "none";
  model: "pass" | "subscription";
  passDays: number;
  billingConfigured: boolean;
  requireSubscription: boolean;
  trialEnabled: boolean;
  trialDays: number;
  currentPeriodEnd: string | null;
  daysLeft: number | null;
  cancelAtPeriodEnd: boolean;
  /** The current pass or trial was granted free (owner approval, trial). */
  complimentary: boolean;
  /** Has paid at least once (passes or subscription). Drives referral eligibility. */
  paid: boolean;
  creditCents: number;
};

export async function latestSubscription(userId: string): Promise<Subscription | null> {
  const db = await getDb();
  const row = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.userId, userId),
    orderBy: [desc(schema.subscriptions.updatedAt)],
  });
  return row ?? null;
}

export const ACTIVE_STATUSES: Subscription["status"][] = ["active", "trialing", "past_due"];

/** Is this row currently granting access? Passes and trials expire; subscriptions follow Stripe status. */
export function isLive(sub: Subscription | null, now = new Date()): boolean {
  if (!sub) return false;
  if (!ACTIVE_STATUSES.includes(sub.status)) return false;
  if (sub.kind === "pass" || sub.kind === "trial") return !!sub.currentPeriodEnd && sub.currentPeriodEnd > now;
  return true;
}

/** Prefer a live row over the most recently updated one (a fresh pass beats an expired trial). */
export async function currentSubscription(userId: string): Promise<Subscription | null> {
  const db = await getDb();
  const rows = await db.query.subscriptions.findMany({ where: eq(schema.subscriptions.userId, userId), orderBy: [desc(schema.subscriptions.updatedAt)] });
  const now = new Date();
  const live = rows.filter((r) => isLive(r, now)).sort((a, b) => (b.currentPeriodEnd?.getTime() ?? 0) - (a.currentPeriodEnd?.getTime() ?? 0));
  return live[0] ?? rows[0] ?? null;
}

export async function hasEverPaid(userId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.query.subscriptions.findMany({ where: eq(schema.subscriptions.userId, userId) });
  return rows.some((r) => r.kind !== "trial" && (r.amountCents > 0 || r.kind === "subscription"));
}

export async function getAccess(user: User): Promise<Access> {
  const s = await getLiveSettings();
  const billingConfigured = !!s.integrations.stripe.secretKey && !!s.pricing.stripePriceId;
  const sub = await currentSubscription(user.id);
  const { availableCreditCents } = await import("./referrals");
  const now = new Date();
  const end = sub?.currentPeriodEnd ?? null;
  const base = {
    billingConfigured,
    requireSubscription: s.pricing.requireSubscription,
    model: s.pricing.model,
    passDays: s.pricing.passDays,
    trialEnabled: s.pricing.trialEnabled,
    trialDays: s.pricing.trialDays,
    status: (sub?.status ?? "none") as Access["status"],
    kind: (sub?.kind ?? "none") as Access["kind"],
    complimentary: !!sub && sub.kind !== "subscription" && sub.amountCents === 0,
    currentPeriodEnd: end?.toISOString() ?? null,
    daysLeft: end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400_000)) : null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    paid: await hasEverPaid(user.id),
    creditCents: await availableCreditCents(user.id),
  };
  // Owners always get in. Until Stripe is connected there is nothing to charge, so everyone gets in.
  if (user.role === "owner" || !s.pricing.requireSubscription || !billingConfigured) {
    return { ...base, allowed: true, reason: "none" };
  }
  if (!sub) return { ...base, allowed: false, reason: "no_subscription" };
  if (isLive(sub, now)) return { ...base, allowed: true, reason: "none" };
  if ((sub.kind === "pass" || sub.kind === "trial") && ACTIVE_STATUSES.includes(sub.status)) return { ...base, allowed: false, reason: "expired" };
  return { ...base, allowed: false, reason: "subscription_inactive" };
}

/** Grant `days` of access as a pass (paid) or trial (free). Extends from the current end when one is live. */
export async function grantPass(userId: string, opts: { kind: "pass" | "trial"; days: number; ref: string; amountCents: number; priceId?: string | null }): Promise<Subscription> {
  const db = await getDb();
  const existing = await db.query.subscriptions.findFirst({ where: eq(schema.subscriptions.stripeSubscriptionId, opts.ref) });
  if (existing) return existing;
  const current = await currentSubscription(userId);
  const now = new Date();
  const from = current && isLive(current, now) && current.currentPeriodEnd ? current.currentPeriodEnd : now;
  const end = new Date(from.getTime() + opts.days * 86400_000);
  const [row] = await db
    .insert(schema.subscriptions)
    .values({ userId, stripeSubscriptionId: opts.ref, stripePriceId: opts.priceId ?? null, kind: opts.kind, amountCents: opts.amountCents, status: opts.kind === "trial" ? "trialing" : "active", currentPeriodEnd: end })
    .returning();
  return row;
}

/** Free trial at signup, when the owner has it switched on. */
export async function grantSignupTrial(userId: string): Promise<boolean> {
  const s = await getLiveSettings();
  if (!s.pricing.trialEnabled || s.pricing.trialDays <= 0) return false;
  await grantPass(userId, { kind: "trial", days: s.pricing.trialDays, ref: `trial:${userId}`, amountCents: 0 });
  await track("trial_started", { userId, meta: { days: s.pricing.trialDays } });
  return true;
}
