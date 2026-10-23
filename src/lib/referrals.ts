import "server-only";
import { and, desc, eq, inArray, lt, sum } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Credit, Referral } from "@/db/schema";
import { track } from "./events";
import { getLiveSettings } from "./settings";

/** Called at signup when the new user arrived through someone's link. */
export async function createReferral(referrerId: string, refereeId: string): Promise<Referral | null> {
  if (referrerId === refereeId) return null;
  const db = await getDb();
  const [row] = await db.insert(schema.referrals).values({ referrerId, refereeId }).onConflictDoNothing().returning();
  return row ?? null;
}

/**
 * A referred user completed a paid period (bought a pass or paid a monthly
 * invoice). Once they reach the qualifying count, issue the bonuses once.
 */
export async function recordPaidPeriod(userId: string, amountCents: number): Promise<{ qualified: boolean }> {
  if (amountCents <= 0) return { qualified: false };
  const db = await getDb();
  const ref = await db.query.referrals.findFirst({ where: eq(schema.referrals.refereeId, userId) });
  if (!ref) return { qualified: false };
  const s = await getLiveSettings();
  const paidPeriods = ref.paidPeriods + 1;
  const now = new Date();
  await db
    .update(schema.referrals)
    .set({ paidPeriods, firstPaidAt: ref.firstPaidAt ?? now })
    .where(eq(schema.referrals.id, ref.id));
  await track("referral_payment", { userId, meta: { referrerId: ref.referrerId, paidPeriods } });
  if (ref.qualifiedAt || !s.referrals.enabled || paidPeriods < Math.max(1, s.referrals.qualifyingPayments)) return { qualified: false };
  await db.update(schema.referrals).set({ qualifiedAt: now }).where(eq(schema.referrals.id, ref.id));
  if (s.referrals.referrerBonusCents > 0) {
    await db.insert(schema.credits).values({ userId: ref.referrerId, amountCents: s.referrals.referrerBonusCents, reason: "referral_bonus", referralId: ref.id, note: "Friend paid for qualifying use" });
  }
  if (s.referrals.refereeBonusCents > 0) {
    await db.insert(schema.credits).values({ userId: ref.refereeId, amountCents: s.referrals.refereeBonusCents, reason: "referee_bonus", referralId: ref.id, note: "Welcome bonus for joining through a friend" });
  }
  await track("referral_rewarded", { userId: ref.referrerId, meta: { refereeId: userId, referrerBonusCents: s.referrals.referrerBonusCents, refereeBonusCents: s.referrals.refereeBonusCents } });
  return { qualified: true };
}

/* ------------------------------------------------------------------ */
/* Credits                                                             */
/* ------------------------------------------------------------------ */

const PENDING_TTL_MS = 24 * 3600_000;

/** Credits attached to a checkout that never completed go back to the balance. */
async function releaseStale(userId: string) {
  const db = await getDb();
  await db
    .update(schema.credits)
    .set({ status: "available", checkoutSessionId: null })
    .where(and(eq(schema.credits.userId, userId), eq(schema.credits.status, "pending"), lt(schema.credits.createdAt, new Date(Date.now() - PENDING_TTL_MS))));
}

export async function availableCreditCents(userId: string): Promise<number> {
  await releaseStale(userId);
  const db = await getDb();
  const [row] = await db.select({ total: sum(schema.credits.amountCents) }).from(schema.credits).where(and(eq(schema.credits.userId, userId), eq(schema.credits.status, "available")));
  return Number(row?.total ?? 0);
}

/** Reserve up to `capCents` of credit for a checkout. Returns the reserved amount. */
export async function reserveCredits(userId: string, checkoutSessionId: string, capCents: number): Promise<number> {
  const db = await getDb();
  await releaseStale(userId);
  const rows = await db.query.credits.findMany({ where: and(eq(schema.credits.userId, userId), eq(schema.credits.status, "available")), orderBy: [schema.credits.createdAt] });
  let total = 0;
  const ids: string[] = [];
  for (const c of rows) {
    if (total >= capCents) break;
    total += c.amountCents;
    ids.push(c.id);
  }
  if (ids.length) await db.update(schema.credits).set({ status: "pending", checkoutSessionId }).where(inArray(schema.credits.id, ids));
  return Math.min(total, capCents);
}

export async function finalizeCredits(checkoutSessionId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.update(schema.credits).set({ status: "applied", appliedAt: new Date() }).where(and(eq(schema.credits.checkoutSessionId, checkoutSessionId), eq(schema.credits.status, "pending"))).returning();
  return rows.reduce((t, r) => t + r.amountCents, 0);
}

/** Re-point reserved credits from a placeholder id to the real Stripe session id. */
export async function attachCreditsToSession(placeholder: string, checkoutSessionId: string) {
  const db = await getDb();
  await db.update(schema.credits).set({ checkoutSessionId }).where(eq(schema.credits.checkoutSessionId, placeholder));
}

/* ------------------------------------------------------------------ */
/* Dashboards                                                          */
/* ------------------------------------------------------------------ */

export type ReferralSummary = {
  friendsJoined: number;
  friendsPaid: number;
  friendsQualified: number;
  earnedCents: number;
  availableCents: number;
  appliedCents: number;
  friends: Array<{ name: string; joinedAt: string; paidPeriods: number; qualifiedAt: string | null }>;
  credits: Array<Pick<Credit, "id" | "amountCents" | "reason" | "status" | "note"> & { createdAt: string }>;
};

export async function referralSummary(userId: string): Promise<ReferralSummary> {
  const db = await getDb();
  await releaseStale(userId);
  const refs = await db.query.referrals.findMany({ where: eq(schema.referrals.referrerId, userId), orderBy: [desc(schema.referrals.createdAt)] });
  const refereeIds = refs.map((r) => r.refereeId);
  const users = refereeIds.length ? await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(inArray(schema.users.id, refereeIds)) : [];
  const names = new Map(users.map((u) => [u.id, u.name]));
  const creditRows = await db.query.credits.findMany({ where: eq(schema.credits.userId, userId), orderBy: [desc(schema.credits.createdAt)] });
  const sumBy = (st: Credit["status"][]) => creditRows.filter((c) => st.includes(c.status)).reduce((t, c) => t + c.amountCents, 0);
  return {
    friendsJoined: refs.length,
    friendsPaid: refs.filter((r) => r.paidPeriods > 0).length,
    friendsQualified: refs.filter((r) => r.qualifiedAt).length,
    earnedCents: creditRows.reduce((t, c) => t + c.amountCents, 0),
    availableCents: sumBy(["available", "pending"]),
    appliedCents: sumBy(["applied"]),
    friends: refs.map((r) => ({ name: (names.get(r.refereeId) || "Friend").split(" ")[0], joinedAt: r.createdAt.toISOString(), paidPeriods: r.paidPeriods, qualifiedAt: r.qualifiedAt?.toISOString() ?? null })),
    credits: creditRows.map((c) => ({ id: c.id, amountCents: c.amountCents, reason: c.reason, status: c.status, note: c.note, createdAt: c.createdAt.toISOString() })),
  };
}

export type ReferralProgramStats = {
  referredSignups: number;
  referredSignupsInRange: number;
  referredPaid: number;
  qualified: number;
  qualifiedInRange: number;
  conversionPct: number;
  creditsIssuedCents: number;
  creditsRedeemedCents: number;
  creditsOutstandingCents: number;
  activeReferrers: number;
  topReferrers: Array<{ userId: string; name: string; email: string; joined: number; paid: number; qualified: number; earnedCents: number }>;
};

export async function referralProgramStats(since: Date): Promise<ReferralProgramStats> {
  const db = await getDb();
  const refs = await db.select().from(schema.referrals);
  const creditRows = await db.select().from(schema.credits);
  const byReferrer = new Map<string, { joined: number; paid: number; qualified: number; earnedCents: number }>();
  for (const r of refs) {
    const cur = byReferrer.get(r.referrerId) ?? { joined: 0, paid: 0, qualified: 0, earnedCents: 0 };
    cur.joined++;
    if (r.paidPeriods > 0) cur.paid++;
    if (r.qualifiedAt) cur.qualified++;
    byReferrer.set(r.referrerId, cur);
  }
  for (const c of creditRows) {
    if (c.reason !== "referral_bonus") continue;
    const cur = byReferrer.get(c.userId);
    if (cur) cur.earnedCents += c.amountCents;
  }
  const ids = [...byReferrer.keys()];
  const users = ids.length ? await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email }).from(schema.users).where(inArray(schema.users.id, ids)) : [];
  const u = new Map(users.map((x) => [x.id, x]));
  const top = ids
    .map((id) => ({ userId: id, name: u.get(id)?.name ?? "", email: u.get(id)?.email ?? "", ...byReferrer.get(id)! }))
    .sort((a, b) => b.qualified - a.qualified || b.paid - a.paid || b.joined - a.joined)
    .slice(0, 10);
  const referredPaid = refs.filter((r) => r.paidPeriods > 0).length;
  return {
    referredSignups: refs.length,
    referredSignupsInRange: refs.filter((r) => r.createdAt >= since).length,
    referredPaid,
    qualified: refs.filter((r) => r.qualifiedAt).length,
    qualifiedInRange: refs.filter((r) => r.qualifiedAt && r.qualifiedAt >= since).length,
    conversionPct: refs.length ? Math.round((referredPaid / refs.length) * 1000) / 10 : 0,
    creditsIssuedCents: creditRows.reduce((t, c) => t + c.amountCents, 0),
    creditsRedeemedCents: creditRows.filter((c) => c.status === "applied").reduce((t, c) => t + c.amountCents, 0),
    creditsOutstandingCents: creditRows.filter((c) => c.status !== "applied").reduce((t, c) => t + c.amountCents, 0),
    activeReferrers: ids.length,
    topReferrers: top,
  };
}
