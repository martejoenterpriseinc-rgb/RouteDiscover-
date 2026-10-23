import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Trip, TripStop } from "@/db/schema";
import { randomToken } from "./crypto";
import { invalidatePublicStats } from "./public-stats";
import { distanceToRoute, indexRoute, simplifyTo } from "./geo";
import { route as planRoute } from "./providers/routing";
import type { GeoResult, LatLng, Place } from "./types";

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const today = () => new Date().toISOString().slice(0, 10);

export async function listTrips(userId: string): Promise<Trip[]> {
  const db = await getDb();
  return db.query.trips.findMany({ where: eq(schema.trips.userId, userId), orderBy: [desc(schema.trips.startDate)] });
}

export async function getTrip(userId: string, id: string): Promise<Trip | null> {
  const db = await getDb();
  const t = await db.query.trips.findFirst({ where: and(eq(schema.trips.id, id), eq(schema.trips.userId, userId)) });
  return t ?? null;
}

export async function getPublicTrip(token: string): Promise<Trip | null> {
  const db = await getDb();
  const t = await db.query.trips.findFirst({ where: and(eq(schema.trips.shareToken, token), eq(schema.trips.isPublic, true)) });
  return t ?? null;
}

export type NewTripInput = {
  name: string;
  origin: GeoResult;
  destination: GeoResult;
  startDate: string;
  endDate: string;
  radiusMiles: number;
  notes?: string;
  route?: { geometry: LatLng[]; distanceMiles: number; durationMinutes: number } | null;
};

export async function createTrip(userId: string, input: NewTripInput): Promise<Trip> {
  const db = await getDb();
  let r = input.route ?? null;
  if (!r || r.geometry.length < 2) {
    const planned = await planRoute(input.origin, input.destination).catch(() => null);
    if (planned) r = planned.data;
  }
  const [trip] = await db
    .insert(schema.trips)
    .values({
      userId,
      name: input.name,
      origin: input.origin,
      destination: input.destination,
      startDate: input.startDate,
      endDate: input.endDate,
      radiusMiles: input.radiusMiles,
      notes: input.notes ?? "",
      routeGeometry: r ? simplifyTo(r.geometry, 600) : null,
      distanceMiles: r?.distanceMiles ?? null,
      durationMinutes: r?.durationMinutes ?? null,
      shareToken: randomToken(12),
    })
    .returning();
  invalidatePublicStats();
  return trip;
}

export async function updateTrip(userId: string, id: string, patch: Partial<Trip>): Promise<Trip | null> {
  const db = await getDb();
  const [t] = await db
    .update(schema.trips)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(schema.trips.id, id), eq(schema.trips.userId, userId)))
    .returning();
  return t ?? null;
}

export async function deleteTrip(userId: string, id: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.delete(schema.trips).where(and(eq(schema.trips.id, id), eq(schema.trips.userId, userId))).returning();
  return rows.length > 0;
}

/** Add a place to the trip's stop list (idempotent by place id), computing its mile marker. */
export function withStop(trip: Trip, place: Place, note?: string, day?: string): TripStop[] {
  if (trip.stops.some((s) => s.id === place.id)) return trip.stops;
  const stop: TripStop = { ...place, addedAt: new Date().toISOString(), note, day: day && day >= trip.startDate && day <= trip.endDate ? day : undefined };
  if (trip.routeGeometry && trip.routeGeometry.length > 1) {
    const d = distanceToRoute(place, indexRoute(trip.routeGeometry));
    stop.alongMiles = d.alongMiles;
    stop.detourMiles = d.detourMiles;
  }
  return [...trip.stops, stop].sort((a, b) => (a.alongMiles ?? Infinity) - (b.alongMiles ?? Infinity));
}

export function isHistory(t: Trip): boolean {
  return t.status === "completed" || t.status === "canceled" || t.endDate < today();
}
