import type { Trip } from "@/db/schema";
import { parseGeoResult } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/events";
import { body, fail, handle, json, str } from "@/lib/http";
import { DATE_RE, deleteTrip, getTrip, updateTrip } from "@/lib/trips";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const trip = await getTrip(user.id, (await params).id);
    if (!trip) return fail("Trip not found.", 404);
    return json({ trip });
  } catch (err) {
    return handle(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const b = await body(req);
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await getTrip(user.id, id);
    if (!existing) return fail("Trip not found.", 404);
    const patch: Partial<Trip> = {};
    if (typeof b.name === "string" && b.name.trim()) patch.name = str(b.name, 120);
    if (typeof b.notes === "string") patch.notes = str(b.notes, 4000);
    if (typeof b.startDate === "string") {
      if (!DATE_RE.test(b.startDate)) return fail("Dates must be YYYY-MM-DD.");
      patch.startDate = b.startDate;
    }
    if (typeof b.endDate === "string") {
      if (!DATE_RE.test(b.endDate)) return fail("Dates must be YYYY-MM-DD.");
      patch.endDate = b.endDate;
    }
    const start = patch.startDate ?? existing.startDate;
    const end = patch.endDate ?? existing.endDate;
    if (end < start) return fail("The trip can't end before it starts.");
    if (typeof b.radiusMiles === "number") patch.radiusMiles = Math.min(50, Math.max(1, Math.round(b.radiusMiles)));
    if (b.status === "planned" || b.status === "completed" || b.status === "canceled") patch.status = b.status;
    if (typeof b.isPublic === "boolean") patch.isPublic = b.isPublic;
    const origin = parseGeoResult(b.origin);
    const destination = parseGeoResult(b.destination);
    if (origin) patch.origin = origin;
    if (destination) patch.destination = destination;
    if (Array.isArray(b.stops)) {
      // Reorder / annotate existing stops only; adding goes through /stops.
      const byId = new Map(existing.stops.map((s) => [s.id, s]));
      patch.stops = (b.stops as Array<Record<string, unknown>>)
        .map((s) => {
          const cur = byId.get(String(s.id));
          if (!cur) return null;
          return { ...cur, note: typeof s.note === "string" ? s.note.slice(0, 500) : cur.note, day: typeof s.day === "string" && DATE_RE.test(s.day) ? s.day : cur.day };
        })
        .filter((s): s is NonNullable<typeof s> => !!s);
    }
    const trip = await updateTrip(user.id, id, patch);
    if (patch.status === "completed" && existing.status !== "completed") {
      await track("trip_completed", { userId: user.id, meta: { tripId: id } });
    }
    return json({ trip });
  } catch (err) {
    return handle(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const ok = await deleteTrip(user.id, (await params).id);
    if (!ok) return fail("Trip not found.", 404);
    return json({ ok: true });
  } catch (err) {
    return handle(err);
  }
}
