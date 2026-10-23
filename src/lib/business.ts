import "server-only";
import { and, count, desc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Business, BusinessPlan, BusinessSource, Submission, User } from "@/db/schema";
import { track } from "./events";
import { invalidatePublicStats } from "./public-stats";
import { lookupPlace } from "./providers/places";
import { getLiveSettings } from "./settings";
import type { Hotel, Place } from "./types";

/* ------------------------------------------------------------------ */
/* Listings                                                            */
/* ------------------------------------------------------------------ */

export function sourceFromPlace(p: Place): BusinessSource {
  const t = p.tags ?? {};
  return {
    name: p.name,
    category: p.category,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    phone: p.phone,
    website: p.website,
    hours: p.openingHours,
    cuisine: t.cuisine,
    tags: p.tags,
    provider: p.id.startsWith("osm-") ? "osm" : p.id.startsWith("ocm-") ? "ocm" : p.id.startsWith("demo-") ? "demo" : "unknown",
  };
}

/** Find or create the listing row for a provider place. */
export async function ensureListing(place: Place): Promise<Business> {
  const db = await getDb();
  const existing = await db.query.businesses.findFirst({ where: eq(schema.businesses.placeId, place.id) });
  if (existing) return existing;
  const [row] = await db.insert(schema.businesses).values({ placeId: place.id, source: sourceFromPlace(place) }).onConflictDoNothing().returning();
  return row ?? (await db.query.businesses.findFirst({ where: eq(schema.businesses.placeId, place.id) }))!;
}

export async function getBusiness(id: string): Promise<Business | null> {
  const db = await getDb();
  return (await db.query.businesses.findFirst({ where: eq(schema.businesses.id, id) })) ?? null;
}

/** What visitors see: owner overrides win over the synced source. */
export type PresentedBusiness = {
  id: string;
  placeId: string;
  name: string;
  category: Business["source"]["category"];
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  hours?: string;
  description?: string;
  menu?: string;
  specials?: string;
  cuisine?: string;
  provider: BusinessSource["provider"];
  claimed: boolean;
  sponsored: boolean;
  sponsorUntil: string | null;
  sourceSyncedAt: string;
  overrides: Record<string, boolean>;
};

export function present(b: Business): PresentedBusiness {
  const s = b.source;
  const sponsored = !!b.sponsorUntil && b.sponsorUntil.getTime() > Date.now();
  return {
    id: b.id,
    placeId: b.placeId,
    name: b.name ?? s.name,
    category: s.category,
    lat: s.lat,
    lng: s.lng,
    address: b.address ?? s.address,
    phone: b.phone ?? s.phone,
    website: b.website ?? s.website,
    hours: b.hours ?? s.hours,
    description: b.description ?? undefined,
    menu: b.menu ?? undefined,
    specials: b.specials ?? undefined,
    cuisine: s.cuisine,
    provider: s.provider,
    claimed: b.claimStatus === "claimed",
    sponsored,
    sponsorUntil: b.sponsorUntil?.toISOString() ?? null,
    sourceSyncedAt: b.sourceSyncedAt.toISOString(),
    overrides: { name: b.name != null, address: b.address != null, phone: b.phone != null, website: b.website != null, hours: b.hours != null },
  };
}

export async function ratingFor(businessIds: string[]): Promise<Map<string, { rating: number; count: number }>> {
  if (!businessIds.length) return new Map();
  const db = await getDb();
  const rows = await db
    .select({ businessId: schema.submissions.businessId, avg: sql<number>`avg((${schema.submissions.payload} ->> 'rating')::numeric)`, c: count() })
    .from(schema.submissions)
    .where(and(inArray(schema.submissions.businessId, businessIds), eq(schema.submissions.type, "review"), eq(schema.submissions.status, "approved")))
    .groupBy(schema.submissions.businessId);
  return new Map(rows.map((r) => [r.businessId, { rating: Math.round(Number(r.avg) * 10) / 10, count: Number(r.c) }]));
}

/**
 * Overlay claimed/sponsored listings onto search results: claimed businesses
 * show their own name/address/hours, sponsored ones float to the top.
 */
export async function decorateResults<T extends Place | Hotel>(items: T[]): Promise<T[]> {
  if (!items.length) return items;
  const db = await getDb();
  const ids = items.map((i) => i.id);
  const rows = await db.select().from(schema.businesses).where(inArray(schema.businesses.placeId, ids.slice(0, 500)));
  if (!rows.length) return items;
  const byPlace = new Map(rows.map((b) => [b.placeId, b]));
  const ratings = await ratingFor(rows.map((b) => b.id));
  const now = Date.now();
  const out = items.map((item) => {
    const b = byPlace.get(item.id);
    if (!b) return item;
    const p = present(b);
    const r = ratings.get(b.id);
    const sponsored = !!b.sponsorUntil && b.sponsorUntil.getTime() > now;
    const base = { ...item, listingId: b.id, claimed: p.claimed, sponsored, rating: r?.rating, reviewCount: r?.count };
    if (!p.claimed) return base;
    if ("category" in item) {
      return { ...base, name: p.name, address: p.address, website: p.website, phone: p.phone, openingHours: p.hours } as T;
    }
    return { ...base, name: p.name, address: p.address, website: p.website, phone: p.phone } as T;
  });
  return out.sort((a, b) => Number(!!b.sponsored) - Number(!!a.sponsored));
}

/* ------------------------------------------------------------------ */
/* Claims & plans                                                      */
/* ------------------------------------------------------------------ */

export async function activePlans(businessId: string): Promise<BusinessPlan[]> {
  const db = await getDb();
  const now = new Date();
  const rows = await db.query.businessPlans.findMany({ where: and(eq(schema.businessPlans.businessId, businessId), eq(schema.businessPlans.status, "active")), orderBy: [desc(schema.businessPlans.createdAt)] });
  return rows.filter((p) => !p.endsAt || p.endsAt > now);
}

export type PlanSummary = { basic: boolean; sponsor: boolean; sponsorUntil: string | null; basicRef: string | null };

export async function planSummary(business: Business): Promise<PlanSummary> {
  const plans = await activePlans(business.id);
  const basic = plans.find((p) => p.plan === "basic");
  const sponsorActive = !!business.sponsorUntil && business.sponsorUntil.getTime() > Date.now();
  return { basic: !!basic || sponsorActive, sponsor: sponsorActive, sponsorUntil: business.sponsorUntil?.toISOString() ?? null, basicRef: basic?.stripeRef ?? null };
}

/** Grant a plan (after payment, or immediately when payment isn't required) and mark the business claimed. */
export async function grantPlan(opts: { businessId: string; userId: string; plan: "basic" | "sponsor"; stripeRef: string; amountCents: number; currency: string }): Promise<Business> {
  const db = await getDb();
  const s = await getLiveSettings();
  const business = await getBusiness(opts.businessId);
  if (!business) throw new Error("Business not found.");
  const now = new Date();
  let endsAt: Date | null = null;
  if (opts.plan === "sponsor") {
    const from = business.sponsorUntil && business.sponsorUntil > now ? business.sponsorUntil : now;
    endsAt = new Date(from.getTime() + s.business.sponsorDays * 86400_000);
  }
  // Idempotent on the Stripe reference.
  const existing = await db.query.businessPlans.findFirst({ where: eq(schema.businessPlans.stripeRef, opts.stripeRef) });
  if (!existing || opts.stripeRef === "manual") {
    await db.insert(schema.businessPlans).values({ businessId: opts.businessId, userId: opts.userId, plan: opts.plan, status: "active", stripeRef: opts.stripeRef, amountCents: opts.amountCents, currency: opts.currency, startsAt: now, endsAt });
  } else if (existing.status !== "active") {
    await db.update(schema.businessPlans).set({ status: "active", startsAt: now, endsAt, updatedAt: now }).where(eq(schema.businessPlans.id, existing.id));
  } else {
    return business;
  }
  const patch: Partial<Business> = { updatedAt: now };
  if (business.claimStatus !== "claimed") {
    patch.claimStatus = "claimed";
    patch.claimedBy = opts.userId;
    patch.claimedAt = now;
    await track("business_claimed", { userId: opts.userId, meta: { businessId: business.id, plan: opts.plan, paid: opts.stripeRef !== "manual" } });
    invalidatePublicStats();
  }
  if (opts.plan === "sponsor") {
    patch.sponsorUntil = endsAt;
    await track("sponsor_purchased", { userId: opts.userId, meta: { businessId: business.id, days: s.business.sponsorDays, amountCents: opts.amountCents } });
  }
  const [updated] = await db.update(schema.businesses).set(patch).where(eq(schema.businesses.id, business.id)).returning();
  return updated;
}

export async function setBasicPlanStatus(stripeRef: string, status: BusinessPlan["status"]): Promise<boolean> {
  const db = await getDb();
  const rows = await db.update(schema.businessPlans).set({ status, updatedAt: new Date() }).where(eq(schema.businessPlans.stripeRef, stripeRef)).returning();
  return rows.length > 0;
}

export async function revokeClaim(businessId: string): Promise<void> {
  const db = await getDb();
  await db.update(schema.businesses).set({ claimStatus: "revoked", sponsorUntil: null, updatedAt: new Date() }).where(eq(schema.businesses.id, businessId));
  await db.update(schema.businessPlans).set({ status: "canceled", updatedAt: new Date() }).where(and(eq(schema.businessPlans.businessId, businessId), eq(schema.businessPlans.status, "active")));
}

export function canManage(user: User, business: Business): boolean {
  return user.role === "owner" || (business.claimStatus === "claimed" && business.claimedBy === user.id);
}

export async function myBusinesses(userId: string): Promise<Business[]> {
  const db = await getDb();
  return db.query.businesses.findMany({ where: and(eq(schema.businesses.claimedBy, userId), eq(schema.businesses.claimStatus, "claimed")), orderBy: [desc(schema.businesses.claimedAt)] });
}

/* ------------------------------------------------------------------ */
/* Sync from online sources                                            */
/* ------------------------------------------------------------------ */

export async function syncFromSource(business: Business): Promise<{ business: Business; changed: string[]; source: "live" | "demo" }> {
  const r = await lookupPlace(business.placeId);
  if (!r.data) throw new Error("The online source no longer lists this place.");
  const fresh = sourceFromPlace(r.data);
  const old = business.source;
  const changed = (["name", "address", "phone", "website", "hours"] as const).filter((k) => (old[k] ?? "") !== (fresh[k] ?? ""));
  const db = await getDb();
  const [updated] = await db.update(schema.businesses).set({ source: fresh, sourceSyncedAt: new Date(), updatedAt: new Date() }).where(eq(schema.businesses.id, business.id)).returning();
  return { business: updated, changed, source: r.source };
}

/* ------------------------------------------------------------------ */
/* Traffic                                                             */
/* ------------------------------------------------------------------ */

export async function businessTraffic(business: Business, days = 30) {
  const db = await getDb();
  const since = new Date(Date.now() - days * 86400_000);
  const dayKey = sql<string>`to_char(${schema.events.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
  const byBusiness = sql`${schema.events.meta} ->> 'businessId' = ${business.id}`;
  const byPlace = sql`${schema.events.meta} ->> 'placeId' = ${business.placeId}`;
  const n = async (q: Promise<Array<{ c: number }>>) => Number((await q)[0]?.c ?? 0);
  const views = await n(db.select({ c: count() }).from(schema.events).where(and(eq(schema.events.type, "business_view"), byBusiness, gte(schema.events.createdAt, since))));
  const clicks = await db
    .select({ kind: sql<string>`${schema.events.meta} ->> 'kind'`, c: count() })
    .from(schema.events)
    .where(and(eq(schema.events.type, "business_click"), byBusiness, gte(schema.events.createdAt, since)))
    .groupBy(sql`${schema.events.meta} ->> 'kind'`);
  const tripAdds = await n(db.select({ c: count() }).from(schema.events).where(and(eq(schema.events.type, "stop_added"), byPlace, gte(schema.events.createdAt, since))));
  const impressions = await n(db.select({ c: count() }).from(schema.events).where(and(eq(schema.events.type, "business_impression"), byBusiness, gte(schema.events.createdAt, since))));
  const daily = await db
    .select({ day: dayKey, value: count() })
    .from(schema.events)
    .where(and(eq(schema.events.type, "business_view"), byBusiness, gte(schema.events.createdAt, since)))
    .groupBy(dayKey);
  const map = new Map(daily.map((d) => [d.day, Number(d.value)]));
  const series: Array<{ day: string; value: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    series.push({ day: d, value: map.get(d) ?? 0 });
  }
  const pending = await n(db.select({ c: count() }).from(schema.submissions).where(and(eq(schema.submissions.businessId, business.id), eq(schema.submissions.status, "pending"))));
  const approved = await n(db.select({ c: count() }).from(schema.submissions).where(and(eq(schema.submissions.businessId, business.id), eq(schema.submissions.status, "approved"))));
  return {
    days,
    views,
    impressions,
    clicks: Object.fromEntries(clicks.map((c) => [c.kind ?? "other", Number(c.c)])),
    tripAdds,
    series,
    submissions: { pending, approved },
  };
}

/* ------------------------------------------------------------------ */
/* Submissions                                                         */
/* ------------------------------------------------------------------ */

export async function approvedSubmissions(businessId: string): Promise<Submission[]> {
  const db = await getDb();
  return db.query.submissions.findMany({ where: and(eq(schema.submissions.businessId, businessId), eq(schema.submissions.status, "approved")), orderBy: [desc(schema.submissions.createdAt)], limit: 200 });
}

export async function pendingSubmissions(businessId: string, includeFlagged: boolean): Promise<Submission[]> {
  const db = await getDb();
  const rows = await db.query.submissions.findMany({ where: and(eq(schema.submissions.businessId, businessId), eq(schema.submissions.status, "pending")), orderBy: [desc(schema.submissions.createdAt)], limit: 200 });
  return includeFlagged ? rows : rows.filter((r) => !r.flagged);
}

/** Apply the effect of an approved submission (info/hours suggestions update the listing; photos become visible). */
export async function applyApproval(sub: Submission): Promise<void> {
  const db = await getDb();
  if (sub.type === "info" && sub.payload.field && typeof sub.payload.value === "string") {
    await db.update(schema.businesses).set({ [sub.payload.field]: sub.payload.value, updatedAt: new Date() }).where(eq(schema.businesses.id, sub.businessId));
  }
  if (sub.type === "hours" && typeof sub.payload.value === "string") {
    await db.update(schema.businesses).set({ hours: sub.payload.value, updatedAt: new Date() }).where(eq(schema.businesses.id, sub.businessId));
  }
  if (sub.type === "photo" && sub.payload.photoId) {
    await db.update(schema.photos).set({ approved: true }).where(eq(schema.photos.id, sub.payload.photoId));
  }
}

export async function moderate(sub: Submission, decision: "approved" | "rejected", reviewer: User, role: "business" | "owner", note?: string): Promise<Submission> {
  const db = await getDb();
  const [updated] = await db
    .update(schema.submissions)
    .set({ status: decision, reviewedBy: reviewer.id, reviewedRole: role, reviewedAt: new Date(), note: note ?? null })
    .where(eq(schema.submissions.id, sub.id))
    .returning();
  if (decision === "approved") await applyApproval(updated);
  await track("submission_moderated", { userId: reviewer.id, meta: { submissionId: sub.id, businessId: sub.businessId, decision, role, type: sub.type } });
  return updated;
}

export async function submitterContext(user: User, businessId: string) {
  const db = await getDb();
  const since24 = new Date(Date.now() - 86400_000);
  const since30 = new Date(Date.now() - 30 * 86400_000);
  const n = async (q: Promise<Array<{ c: number }>>) => Number((await q)[0]?.c ?? 0);
  return {
    accountAgeHours: (Date.now() - user.createdAt.getTime()) / 3600_000,
    submissionsLast24h: await n(db.select({ c: count() }).from(schema.submissions).where(and(eq(schema.submissions.userId, user.id), gt(schema.submissions.createdAt, since24)))),
    submissionsOnThisBusinessLast24h: await n(db.select({ c: count() }).from(schema.submissions).where(and(eq(schema.submissions.userId, user.id), eq(schema.submissions.businessId, businessId), gt(schema.submissions.createdAt, since24)))),
    rejectedLast30d: await n(db.select({ c: count() }).from(schema.submissions).where(and(eq(schema.submissions.userId, user.id), eq(schema.submissions.status, "rejected"), gt(schema.submissions.createdAt, since30)))),
    banned: user.banned,
  };
}
