import "server-only";
import { and, count, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type PublicStats = { travelers: number; businessesClaimed: number; activeTrips: number; updatedAt: string };

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
    updatedAt: new Date().toISOString(),
  };
  globalThis.__routediscoverPublicStats = { value, at: Date.now() };
  return value;
}
