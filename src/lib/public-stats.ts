import "server-only";
import { and, count, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type PublicStats = { travelers: number; businessesClaimed: number; activeTrips: number; tripsCompleted: number; locations: number; locationsGoogle: number; updatedAt: string };

declare global {
  var __routediscoverPublicStats: { value: PublicStats; at: number } | undefined;
}
const TTL_MS = 60_000;

/** Community KPIs shown on the landing page and app home. Cached for a minute. */
export async function getPublicStats(): Promise<PublicStats> {
  const cached = globalThis.__routediscoverPublicStats;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const db = await getDb();
  const n = async (q: Promise<Array<{ c: number }>>) => Number((await q)[0]?.c ?? 0);
  const today = new Date().toISOString().slice(0, 10);
  const value: PublicStats = {
    travelers: await n(db.select({ c: count() }).from(schema.users)),
    businessesClaimed: await n(db.select({ c: count() }).from(schema.businesses).where(eq(schema.businesses.claimStatus, "claimed"))),
    // Planned trips that haven't ended yet: on the road now or coming up.
    activeTrips: await n(db.select({ c: count() }).from(schema.trips).where(and(eq(schema.trips.status, "planned"), gte(schema.trips.endDate, today)))),
    tripsCompleted: await n(db.select({ c: count() }).from(schema.trips).where(eq(schema.trips.status, "completed"))),
    locations: await n(db.select({ c: count() }).from(schema.placesSeen)),
    locationsGoogle: await n(db.select({ c: count() }).from(schema.placesSeen).where(eq(schema.placesSeen.provider, "google"))),
    updatedAt: new Date().toISOString(),
  };
  globalThis.__routediscoverPublicStats = { value, at: Date.now() };
  return value;
}

export function invalidatePublicStats() {
  globalThis.__routediscoverPublicStats = undefined;
}

/** Remember every place a search surfaced (batched, best-effort). */
export async function rememberPlaces(items: Array<{ id: string; name: string; category?: string; lat: number; lng: number; provider?: string }>) {
  if (!items.length) return;
  try {
    const db = await getDb();
    const rows = items.slice(0, 500).map((p) => ({
      placeId: p.id,
      name: p.name.slice(0, 200),
      provider: (p.provider ?? (p.id.startsWith("google-") ? "google" : p.id.startsWith("osm-") ? "osm" : p.id.startsWith("ocm-") ? "ocm" : p.id.startsWith("demo-") ? "demo" : "unknown")) as "google" | "osm" | "ocm" | "demo" | "unknown",
      category: p.category ?? "other",
      lat: p.lat,
      lng: p.lng,
    }));
    await db
      .insert(schema.placesSeen)
      .values(rows)
      .onConflictDoUpdate({ target: schema.placesSeen.placeId, set: { lastSeenAt: new Date() } });
  } catch (err) {
    console.warn("[routediscover] places index not updated:", err instanceof Error ? err.message : err);
  }
}
