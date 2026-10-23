import { NextResponse } from "next/server";
import { hoursStatus, instantFor, timezoneFor } from "@/lib/hours";
import { readJson } from "@/lib/api";

/**
 * POST { items: [{ id, lat, lng, openingHours?, at? }] } → { [id]: HoursStatus }
 * `at` is a local wall-clock time at the place (YYYY-MM-DDTHH:MM); omitted = now.
 */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const items = Array.isArray(body.items) ? (body.items as Array<Record<string, unknown>>).slice(0, 200) : [];
  const out: Record<string, unknown> = {};
  for (const it of items) {
    const id = typeof it.id === "string" ? it.id : null;
    const lat = Number(it.lat);
    const lng = Number(it.lng);
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const tz = timezoneFor(lat, lng) ?? "UTC";
    const at = typeof it.at === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(it.at) ? instantFor(tz, it.at) : new Date();
    out[id] = hoursStatus({ lat, lng, openingHours: typeof it.openingHours === "string" ? it.openingHours : undefined }, at);
  }
  return NextResponse.json({ hours: out });
}
