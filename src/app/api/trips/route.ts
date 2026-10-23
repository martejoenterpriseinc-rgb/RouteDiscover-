import { parseGeoResult, parseLatLng } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/events";
import { body, fail, handle, json, str } from "@/lib/http";
import { DATE_RE, createTrip, listTrips, today } from "@/lib/trips";
import type { LatLng } from "@/lib/types";

export async function GET() {
  try {
    const user = await requireUser();
    return json({ trips: await listTrips(user.id) });
  } catch (err) {
    return handle(err);
  }
}

export async function POST(req: Request) {
  const b = await body(req);
  try {
    const user = await requireUser();
    const origin = parseGeoResult(b.origin);
    const destination = parseGeoResult(b.destination);
    if (!origin || !destination) return fail("Pick a starting point and a destination.");
    const startDate = str(b.startDate, 10) || today();
    const endDate = str(b.endDate, 10) || startDate;
    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) return fail("Dates must be YYYY-MM-DD.");
    if (endDate < startDate) return fail("The trip can't end before it starts.");
    const name = str(b.name, 120) || `${origin.label} → ${destination.label}`;
    const radiusMiles = typeof b.radiusMiles === "number" ? Math.min(50, Math.max(1, Math.round(b.radiusMiles))) : 10;
    let route: { geometry: LatLng[]; distanceMiles: number; durationMinutes: number } | null = null;
    if (b.route && typeof b.route === "object") {
      const r = b.route as Record<string, unknown>;
      const geometry = Array.isArray(r.geometry) ? r.geometry.map(parseLatLng).filter((p): p is LatLng => !!p) : [];
      if (geometry.length >= 2) {
        route = {
          geometry,
          distanceMiles: typeof r.distanceMiles === "number" ? r.distanceMiles : 0,
          durationMinutes: typeof r.durationMinutes === "number" ? r.durationMinutes : 0,
        };
      }
    }
    const trip = await createTrip(user.id, { name, origin, destination, startDate, endDate, radiusMiles, notes: str(b.notes, 4000), route });
    await track("trip_created", { userId: user.id, meta: { tripId: trip.id, miles: trip.distanceMiles ?? 0 } });
    return json({ trip }, { status: 201 });
  } catch (err) {
    return handle(err);
  }
}
