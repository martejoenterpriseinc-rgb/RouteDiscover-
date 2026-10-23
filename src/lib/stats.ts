import "server-only";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getLiveSettings } from "./settings";

export type DailyPoint = { day: string; value: number };
export type OwnerStats = {
  generatedAt: string;
  rangeDays: number;
  users: { total: number; newInRange: number; new7d: number; active1d: number; active7d: number; active30d: number };
  subscriptions: { active: number; trialing: number; pastDue: number; canceled: number; cancelingAtPeriodEnd: number; mrrCents: number; priceCents: number; currency: string; churnRatePct: number; conversionPct: number };
  acquisition: { landingViews: number; landingVisitors: number; storeClicksIos: number; storeClicksAndroid: number; pwaInstallClicks: number; pwaInstalled: number; visitorToSignupPct: number; invitesSent: number; invitesAccepted: number; referredSignups: number };
  engagement: { trips: number; tripsInRange: number; tripsCompleted: number; tripsShared: number; stops: number; shares: number; logins: number };
  businesses: { listings: number; claimed: number; claimedInRange: number; basic: number; sponsors: number; revenueCents: number; revenueInRangeCents: number; pendingSubmissions: number; flaggedSubmissions: number; submissionsInRange: number; approvedInRange: number; rejectedInRange: number };
  series: { signups: DailyPoint[]; landingViews: DailyPoint[]; subscriptionsStarted: DailyPoint[]; downloads: DailyPoint[] };
  recent: Array<{ id: number; type: string; userEmail: string | null; meta: Record<string, unknown>; createdAt: string }>;
  setup: { stripeConnected: boolean; priceSynced: boolean; webhookSecret: boolean; storeLinks: boolean; emailConnected: boolean; requireSubscription: boolean };
};

const dayKey = sql<string>`to_char(${schema.events.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;

function fillSeries(rows: Array<{ day: string; value: number }>, days: number): DailyPoint[] {
  const map = new Map(rows.map((r) => [r.day, Number(r.value)]));
  const out: DailyPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, value: map.get(key) ?? 0 });
  }
  return out;
}

export async function getOwnerStats(rangeDays = 30): Promise<OwnerStats> {
  const db = await getDb();
  const s = await getLiveSettings();
  const since = new Date(Date.now() - rangeDays * 86400_000);
  const since7 = new Date(Date.now() - 7 * 86400_000);
  const since1 = new Date(Date.now() - 86400_000);
  const since30 = new Date(Date.now() - 30 * 86400_000);
  const n = async (q: Promise<Array<{ c: number }>>) => Number((await q)[0]?.c ?? 0);
  const eventCount = (type: string, from?: Date) =>
    n(db.select({ c: count() }).from(schema.events).where(from ? and(eq(schema.events.type, type), gte(schema.events.createdAt, from)) : eq(schema.events.type, type)));
  const eventCountMeta = (type: string, key: string, value: string, from?: Date) =>
    n(
      db
        .select({ c: count() })
        .from(schema.events)
        .where(and(eq(schema.events.type, type), sql`${schema.events.meta} ->> ${key} = ${value}`, ...(from ? [gte(schema.events.createdAt, from)] : []))),
    );
  const series = async (type: string) =>
    fillSeries(
      await db
        .select({ day: dayKey, value: count() })
        .from(schema.events)
        .where(and(eq(schema.events.type, type), gte(schema.events.createdAt, since)))
        .groupBy(dayKey),
      rangeDays,
    );

  // Users
  const usersTotal = await n(db.select({ c: count() }).from(schema.users));
  const newInRange = await n(db.select({ c: count() }).from(schema.users).where(gte(schema.users.createdAt, since)));
  const new7d = await n(db.select({ c: count() }).from(schema.users).where(gte(schema.users.createdAt, since7)));
  const active1d = await n(db.select({ c: count() }).from(schema.users).where(gte(schema.users.lastSeenAt, since1)));
  const active7d = await n(db.select({ c: count() }).from(schema.users).where(gte(schema.users.lastSeenAt, since7)));
  const active30d = await n(db.select({ c: count() }).from(schema.users).where(gte(schema.users.lastSeenAt, since30)));

  // Subscriptions: latest row per user
  const subs = await db.select().from(schema.subscriptions).orderBy(desc(schema.subscriptions.updatedAt));
  const latest = new Map<string, (typeof subs)[number]>();
  for (const r of subs) if (!latest.has(r.userId)) latest.set(r.userId, r);
  const byStatus = (st: string[]) => [...latest.values()].filter((r) => st.includes(r.status)).length;
  const active = byStatus(["active"]);
  const trialing = byStatus(["trialing"]);
  const pastDue = byStatus(["past_due"]);
  const canceled = byStatus(["canceled", "unpaid", "incomplete_expired"]);
  const cancelingAtPeriodEnd = [...latest.values()].filter((r) => r.cancelAtPeriodEnd && ["active", "trialing"].includes(r.status)).length;
  const paying = active + pastDue;
  const mrrCents = paying * s.pricing.monthlyPriceCents;
  const canceled30 = await eventCount("subscription_canceled", since30);
  const churnRatePct = paying + trialing + canceled30 > 0 ? Math.round((canceled30 / (paying + trialing + canceled30)) * 1000) / 10 : 0;
  const everSubscribed = latest.size;
  const conversionPct = usersTotal > 0 ? Math.round((everSubscribed / usersTotal) * 1000) / 10 : 0;

  // Acquisition
  const landingViews = await eventCount("landing_view", since);
  const landingVisitors = await n(
    db.select({ c: sql<number>`count(distinct ${schema.events.anonId})` }).from(schema.events).where(and(eq(schema.events.type, "landing_view"), gte(schema.events.createdAt, since))),
  );
  const storeClicksIos = await eventCountMeta("download_click", "platform", "ios");
  const storeClicksAndroid = await eventCountMeta("download_click", "platform", "android");
  const pwaInstallClicks = await eventCountMeta("download_click", "platform", "pwa");
  const pwaInstalled = await eventCount("pwa_installed");
  const visitorToSignupPct = landingVisitors > 0 ? Math.round((newInRange / landingVisitors) * 1000) / 10 : 0;
  const invitesSent = await n(db.select({ c: count() }).from(schema.invites));
  const invitesAccepted = await n(db.select({ c: count() }).from(schema.invites).where(sql`${schema.invites.acceptedBy} is not null`));
  const referredSignups = await n(db.select({ c: count() }).from(schema.users).where(sql`${schema.users.referredBy} is not null`));

  // Engagement
  const trips = await n(db.select({ c: count() }).from(schema.trips));
  const tripsInRange = await n(db.select({ c: count() }).from(schema.trips).where(gte(schema.trips.createdAt, since)));
  const tripsCompleted = await n(db.select({ c: count() }).from(schema.trips).where(eq(schema.trips.status, "completed")));
  const tripsShared = await n(db.select({ c: count() }).from(schema.trips).where(eq(schema.trips.isPublic, true)));
  const stops = await n(db.select({ c: sql<number>`coalesce(sum(jsonb_array_length(${schema.trips.stops})), 0)` }).from(schema.trips));
  const shares = await eventCount("trip_shared");
  const logins = await eventCount("login", since);

  // Businesses
  const bizRows = await db.select({ id: schema.businesses.id, claimStatus: schema.businesses.claimStatus, claimedAt: schema.businesses.claimedAt, sponsorUntil: schema.businesses.sponsorUntil }).from(schema.businesses);
  const planRows = await db.select().from(schema.businessPlans);
  const nowMs = Date.now();
  const activeBasic = new Set(planRows.filter((p) => p.plan === "basic" && p.status === "active" && (!p.endsAt || p.endsAt.getTime() > nowMs)).map((p) => p.businessId));
  const sponsors = bizRows.filter((b) => b.sponsorUntil && b.sponsorUntil.getTime() > nowMs).length;
  const businesses = {
    listings: bizRows.length,
    claimed: bizRows.filter((b) => b.claimStatus === "claimed").length,
    claimedInRange: bizRows.filter((b) => b.claimStatus === "claimed" && b.claimedAt && b.claimedAt >= since).length,
    basic: bizRows.filter((b) => activeBasic.has(b.id) && !(b.sponsorUntil && b.sponsorUntil.getTime() > nowMs)).length,
    sponsors,
    revenueCents: planRows.filter((p) => p.status !== "pending").reduce((sum, p) => sum + p.amountCents, 0),
    revenueInRangeCents: planRows.filter((p) => p.status !== "pending" && p.createdAt >= since).reduce((sum, p) => sum + p.amountCents, 0),
    pendingSubmissions: await n(db.select({ c: count() }).from(schema.submissions).where(eq(schema.submissions.status, "pending"))),
    flaggedSubmissions: await n(db.select({ c: count() }).from(schema.submissions).where(and(eq(schema.submissions.status, "pending"), eq(schema.submissions.flagged, true)))),
    submissionsInRange: await n(db.select({ c: count() }).from(schema.submissions).where(gte(schema.submissions.createdAt, since))),
    approvedInRange: await n(db.select({ c: count() }).from(schema.submissions).where(and(eq(schema.submissions.status, "approved"), gte(schema.submissions.createdAt, since)))),
    rejectedInRange: await n(db.select({ c: count() }).from(schema.submissions).where(and(eq(schema.submissions.status, "rejected"), gte(schema.submissions.createdAt, since)))),
  };

  // Recent activity
  const recentRows = await db
    .select({ id: schema.events.id, type: schema.events.type, meta: schema.events.meta, createdAt: schema.events.createdAt, userEmail: schema.users.email })
    .from(schema.events)
    .leftJoin(schema.users, eq(schema.events.userId, schema.users.id))
    .where(inArray(schema.events.type, ["signup", "subscription_started", "subscription_canceled", "subscription_payment_failed", "trip_created", "trip_shared", "invite_sent", "download_click", "pwa_installed", "settings_published", "business_claimed", "sponsor_purchased", "submission_created", "user_banned"]))
    .orderBy(desc(schema.events.id))
    .limit(20);

  return {
    generatedAt: new Date().toISOString(),
    rangeDays,
    users: { total: usersTotal, newInRange, new7d, active1d, active7d, active30d },
    subscriptions: { active, trialing, pastDue, canceled, cancelingAtPeriodEnd, mrrCents, priceCents: s.pricing.monthlyPriceCents, currency: s.pricing.currency, churnRatePct, conversionPct },
    acquisition: { landingViews, landingVisitors, storeClicksIos, storeClicksAndroid, pwaInstallClicks, pwaInstalled, visitorToSignupPct, invitesSent, invitesAccepted, referredSignups },
    engagement: { trips, tripsInRange, tripsCompleted, tripsShared, stops, shares, logins },
    businesses,
    series: {
      signups: await series("signup"),
      landingViews: await series("landing_view"),
      subscriptionsStarted: await series("subscription_started"),
      downloads: await series("download_click"),
    },
    recent: recentRows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    setup: {
      stripeConnected: !!s.integrations.stripe.secretKey,
      priceSynced: !!s.pricing.stripePriceId,
      webhookSecret: !!s.integrations.stripe.webhookSecret,
      storeLinks: !!(s.app.appStoreUrl || s.app.playStoreUrl),
      emailConnected: s.integrations.email.provider !== "none" && !!s.integrations.email.apiKey,
      requireSubscription: s.pricing.requireSubscription,
    },
  };
}

export async function listUsersForOwner(limit = 200) {
  const db = await getDb();
  const users = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt)).limit(limit);
  const subs = await db.select().from(schema.subscriptions).orderBy(desc(schema.subscriptions.updatedAt));
  const latest = new Map<string, (typeof subs)[number]>();
  for (const r of subs) if (!latest.has(r.userId)) latest.set(r.userId, r);
  const tripCounts = await db.select({ userId: schema.trips.userId, c: count() }).from(schema.trips).groupBy(schema.trips.userId);
  const tc = new Map(tripCounts.map((r) => [r.userId, Number(r.c)]));
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
    referred: !!u.referredBy,
    subscription: latest.get(u.id)?.status ?? "none",
    cancelAtPeriodEnd: latest.get(u.id)?.cancelAtPeriodEnd ?? false,
    trips: tc.get(u.id) ?? 0,
  }));
}
