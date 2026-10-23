import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Subscription, User } from "@/db/schema";
import { getLiveSettings } from "./settings";

export type Access = {
  /** May use the app's features. */
  allowed: boolean;
  /** Why not, when not allowed. */
  reason: "none" | "no_subscription" | "subscription_inactive";
  status: Subscription["status"] | "none";
  billingConfigured: boolean;
  requireSubscription: boolean;
  trialDays: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
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

export async function getAccess(user: User): Promise<Access> {
  const s = await getLiveSettings();
  const billingConfigured = !!s.integrations.stripe.secretKey && !!s.pricing.stripePriceId;
  const sub = await latestSubscription(user.id);
  const base = {
    billingConfigured,
    requireSubscription: s.pricing.requireSubscription,
    trialDays: s.pricing.trialDays,
    status: (sub?.status ?? "none") as Access["status"],
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
  };
  // Owners always get in. Until Stripe is connected there is nothing to charge, so everyone gets in.
  if (user.role === "owner" || !s.pricing.requireSubscription || !billingConfigured) {
    return { ...base, allowed: true, reason: "none" };
  }
  if (!sub) return { ...base, allowed: false, reason: "no_subscription" };
  if (ACTIVE_STATUSES.includes(sub.status)) return { ...base, allowed: true, reason: "none" };
  return { ...base, allowed: false, reason: "subscription_inactive" };
}
