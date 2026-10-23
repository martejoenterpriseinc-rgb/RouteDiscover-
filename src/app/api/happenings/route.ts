import { NextResponse } from "next/server";
import { handleError, parseArea, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { track } from "@/lib/events";
import { EVENT_KINDS, searchHappenings, submitHappening } from "@/lib/happenings";
import { body, fail, json, str } from "@/lib/http";
import type { EventKind } from "@/lib/types";

const KINDS = EVENT_KINDS.map((k) => k.id);

/** POST { route[] | center, radiusMiles, from?, to?, kinds? } → events in the area and time window. */
export async function POST(req: Request) {
  const b = await readJson(req);
  if (b instanceof NextResponse) return b;
  const area = parseArea(b, 100);
  if (area instanceof NextResponse) return area;
  const from = typeof b.from === "string" && !Number.isNaN(Date.parse(b.from)) ? new Date(b.from) : new Date();
  const to = typeof b.to === "string" && !Number.isNaN(Date.parse(b.to)) ? new Date(b.to) : new Date(from.getTime() + 30 * 86400_000);
  const kinds = Array.isArray(b.kinds) ? (b.kinds.filter((k): k is EventKind => KINDS.includes(k as EventKind))) : [];
  try {
    const r = await searchHappenings({ ...area, from, to: to > from ? to : new Date(from.getTime() + 86400_000), kinds });
    return NextResponse.json(r);
  } catch (err) {
    return handleError(err);
  }
}

/** PUT: a signed-in traveller submits an event (owner's own submissions go live at once). */
export async function PUT(req: Request) {
  const b = await body(req);
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to add an event.", 401);
    const title = str(b.title, 160);
    const kind = KINDS.includes(b.kind as EventKind) ? (b.kind as EventKind) : "other";
    const lat = Number(b.lat);
    const lng = Number(b.lng);
    const startsAt = typeof b.startsAt === "string" ? new Date(b.startsAt) : null;
    const endsAt = typeof b.endsAt === "string" ? new Date(b.endsAt) : startsAt;
    if (!title) return fail("Give the event a name.");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return fail("Pick a location.");
    if (!startsAt || Number.isNaN(startsAt.getTime()) || !endsAt || Number.isNaN(endsAt.getTime())) return fail("Enter when it happens.");
    if (endsAt < startsAt) return fail("It can't end before it starts.");
    const row = await submitHappening(
      { title, kind, description: str(b.description, 2000), venue: str(b.venue, 160), address: str(b.address, 300), lat, lng, startsAt, endsAt, allDay: b.allDay === true, url: str(b.url, 500), price: str(b.price, 80) },
      user.id,
      user.role === "owner",
    );
    await track("event_submitted", { userId: user.id, meta: { id: row.id, kind } });
    return json({ ok: true, status: row.status, id: row.id });
  } catch (err) {
    return handleError(err);
  }
}
