import { requireUser } from "@/lib/auth";
import { isCategoryId } from "@/lib/categories";
import { parseLatLng } from "@/lib/api";
import { body, fail, handle, json, str } from "@/lib/http";
import { getTrip, updateTrip, withStop } from "@/lib/trips";
import { track } from "@/lib/events";
import type { Place } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

function parsePlace(v: unknown): Place | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const ll = parseLatLng(o);
  const id = str(o.id, 120);
  const name = str(o.name, 200);
  const category = typeof o.category === "string" && isCategoryId(o.category) ? o.category : "attractions";
  if (!ll || !id || !name) return null;
  return {
    id,
    name,
    category,
    lat: ll.lat,
    lng: ll.lng,
    address: str(o.address, 300) || undefined,
    website: str(o.website, 500) || undefined,
    phone: str(o.phone, 50) || undefined,
    openingHours: str(o.openingHours, 300) || undefined,
  };
}

export async function POST(req: Request, { params }: Ctx) {
  const b = await body(req);
  try {
    const user = await requireUser();
    const { id } = await params;
    const trip = await getTrip(user.id, id);
    if (!trip) return fail("Trip not found.", 404);
    const place = parsePlace(b.place);
    if (!place) return fail("A place with id, name, lat and lng is required.");
    if (trip.stops.length >= 200) return fail("That's a lot of stops. Trips hold up to 200.");
    const day = typeof b.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.day) ? b.day : undefined;
    const stops = withStop(trip, place, str(b.note, 500) || undefined, day);
    const updated = await updateTrip(user.id, id, { stops });
    if (stops.length !== trip.stops.length) await track("stop_added", { userId: user.id, meta: { placeId: place.id, tripId: id } });
    return json({ trip: updated, added: stops.length !== trip.stops.length });
  } catch (err) {
    return handle(err);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const b = await body(req);
  try {
    const user = await requireUser();
    const { id } = await params;
    const trip = await getTrip(user.id, id);
    if (!trip) return fail("Trip not found.", 404);
    const placeId = str(b.placeId, 120);
    const updated = await updateTrip(user.id, id, { stops: trip.stops.filter((s) => s.id !== placeId) });
    return json({ trip: updated });
  } catch (err) {
    return handle(err);
  }
}
