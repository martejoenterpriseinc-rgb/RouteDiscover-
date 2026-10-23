import "server-only";
import { and, eq, gte, lte, desc, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { fetchWithTimeout, withFallback } from "./config";
import { DEMO_HAPPENINGS } from "./demo/happenings";
import { timezoneFor } from "./hours";
import { getLiveSettings } from "./settings";
import { scopePlaces, type PlaceSearch } from "./providers/places";
import { EVENT_KINDS } from "./event-kinds";
import type { EventKind, Happening, LatLng } from "./types";

export { EVENT_KINDS };

export type EventSearch = ({ kind: "corridor"; route: LatLng[]; radiusMiles: number } | { kind: "point"; center: LatLng; radiusMiles: number }) & {
  from: Date;
  to: Date;
  kinds?: EventKind[];
};

function toSearch(s: EventSearch): PlaceSearch {
  return s.kind === "point" ? { kind: "point", center: s.center, radiusMiles: s.radiusMiles, categories: [] } : { kind: "corridor", route: s.route, radiusMiles: s.radiusMiles, categories: [] };
}

const overlaps = (h: { startsAt: Date | string; endsAt: Date | string }, from: Date, to: Date) => new Date(h.endsAt) >= from && new Date(h.startsAt) <= to;

function present(h: schema.Happening): Happening {
  return {
    id: h.id,
    title: h.title,
    kind: h.kind,
    description: h.description || undefined,
    venue: h.venue || undefined,
    address: h.address || undefined,
    lat: h.lat,
    lng: h.lng,
    startsAt: h.startsAt.toISOString(),
    endsAt: h.endsAt.toISOString(),
    allDay: h.allDay,
    url: h.url || undefined,
    price: h.price || undefined,
    source: h.source,
    timezone: timezoneFor(h.lat, h.lng),
  };
}

/** Approved community events in the time window (geography is applied afterwards). */
async function communityEvents(from: Date, to: Date): Promise<Happening[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.happenings)
    .where(and(eq(schema.happenings.status, "approved"), lte(schema.happenings.startsAt, to), gte(schema.happenings.endsAt, from)))
    .orderBy(schema.happenings.startsAt)
    .limit(2000);
  return rows.map(present);
}

/* ---------------- Ticketmaster ---------------- */

type TmEvent = {
  id: string;
  name: string;
  url?: string;
  dates?: { start?: { dateTime?: string; localDate?: string; localTime?: string }; end?: { dateTime?: string; localDate?: string }; timezone?: string };
  classifications?: Array<{ segment?: { name?: string }; genre?: { name?: string } }>;
  priceRanges?: Array<{ min?: number; max?: number; currency?: string }>;
  _embedded?: { venues?: Array<{ name?: string; location?: { latitude?: string; longitude?: string }; address?: { line1?: string }; city?: { name?: string }; state?: { stateCode?: string } }> };
  info?: string;
};

function tmKind(e: TmEvent): EventKind {
  const seg = e.classifications?.[0]?.segment?.name ?? "";
  const genre = e.classifications?.[0]?.genre?.name ?? "";
  const name = e.name.toLowerCase();
  if (/car show|cruise|auto show|carlisle|hot rod/.test(name)) return "car_show";
  if (/swap meet/.test(name)) return "swap_meet";
  if (/haunt|scream|fright|terror/.test(name)) return "haunted";
  if (/christmas|holiday lights|winter wonder|festival of lights/.test(name)) return "holiday_lights";
  if (/fair\b|carnival/.test(name) || /fair/i.test(genre)) return "fair";
  if (seg === "Music") return "concert";
  if (seg === "Sports") return "sports";
  if (seg === "Arts & Theatre") return "concert";
  if (/festival/i.test(name) || /festival/i.test(genre)) return "festival";
  return "other";
}

async function ticketmaster(apiKey: string, centers: LatLng[], radiusMiles: number, from: Date, to: Date): Promise<Happening[]> {
  const out = new Map<string, Happening>();
  for (const c of centers.slice(0, 6)) {
    const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("latlong", `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`);
    url.searchParams.set("radius", String(Math.min(150, Math.max(1, Math.round(radiusMiles)))));
    url.searchParams.set("unit", "miles");
    url.searchParams.set("size", "100");
    url.searchParams.set("sort", "date,asc");
    url.searchParams.set("startDateTime", from.toISOString().replace(/\.\d{3}Z$/, "Z"));
    url.searchParams.set("endDateTime", to.toISOString().replace(/\.\d{3}Z$/, "Z"));
    const res = await fetchWithTimeout(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Ticketmaster HTTP ${res.status}`);
    const json = (await res.json()) as { _embedded?: { events?: TmEvent[] } };
    for (const e of json._embedded?.events ?? []) {
      const v = e._embedded?.venues?.[0];
      const lat = Number(v?.location?.latitude);
      const lng = Number(v?.location?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const start = e.dates?.start?.dateTime ?? (e.dates?.start?.localDate ? `${e.dates.start.localDate}T${e.dates.start.localTime ?? "12:00:00"}` : null);
      if (!start) continue;
      const startsAt = new Date(start);
      const endsAt = e.dates?.end?.dateTime ? new Date(e.dates.end.dateTime) : new Date(startsAt.getTime() + 3 * 3600_000);
      const price = e.priceRanges?.[0] ? `${e.priceRanges[0].currency === "USD" ? "$" : ""}${e.priceRanges[0].min ?? ""}${e.priceRanges[0].max && e.priceRanges[0].max !== e.priceRanges[0].min ? `–${e.priceRanges[0].max}` : ""}` : undefined;
      out.set(e.id, {
        id: `tm-${e.id}`,
        title: e.name,
        kind: tmKind(e),
        description: e.info,
        venue: v?.name,
        address: [v?.address?.line1, v?.city?.name, v?.state?.stateCode].filter(Boolean).join(", ") || undefined,
        lat,
        lng,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        allDay: !e.dates?.start?.dateTime,
        url: e.url,
        price,
        source: "ticketmaster",
        timezone: e.dates?.timezone ?? timezoneFor(lat, lng),
      });
    }
  }
  return Array.from(out.values());
}

function sampleCenters(s: EventSearch): LatLng[] {
  if (s.kind === "point") return [s.center];
  const pts = s.route;
  if (pts.length <= 6) return pts;
  const step = (pts.length - 1) / 5;
  return Array.from({ length: 6 }, (_, i) => pts[Math.round(i * step)]);
}

/** Demo events are generated relative to today so the seasonal ones are always "coming up". */
export function demoHappenings(now = new Date()): Happening[] {
  return DEMO_HAPPENINGS(now).map((h) => ({ ...h, timezone: timezoneFor(h.lat, h.lng) }));
}

export async function searchHappenings(s: EventSearch) {
  const settings = await getLiveSettings();
  const key = settings.integrations.ticketmaster.apiKey;
  const community = (await communityEvents(s.from, s.to)).filter((h) => overlaps(h, s.from, s.to));
  const r = await withFallback(
    "Ticketmaster",
    async () => {
      if (!key) throw new Error("Ticketmaster key not configured");
      return ticketmaster(key, sampleCenters(s), Math.max(s.radiusMiles, 10), s.from, s.to);
    },
    () => demoHappenings().filter((h) => overlaps(h, s.from, s.to)),
  );
  // Community events are real data, so they count as live even when ticketed events fall back to samples.
  const merged = [...community, ...r.data.filter((h) => !community.some((c) => c.id === h.id))];
  let scoped = scopePlaces(merged, toSearch(s)) as Happening[];
  if (s.kinds?.length) scoped = scoped.filter((h) => s.kinds!.includes(h.kind));
  scoped.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || (a.distanceMiles ?? a.detourMiles ?? 0) - (b.distanceMiles ?? b.detourMiles ?? 0));
  return { ...r, source: community.length && r.source === "demo" ? ("mixed" as const) : r.source, data: scoped.slice(0, 300) };
}

/* ---------------- community submissions & moderation ---------------- */

export async function submitHappening(input: { title: string; kind: EventKind; description: string; venue: string; address: string; lat: number; lng: number; startsAt: Date; endsAt: Date; allDay: boolean; url: string; price: string }, userId: string, autoApprove: boolean) {
  const db = await getDb();
  const [row] = await db
    .insert(schema.happenings)
    .values({ ...input, source: "community", status: autoApprove ? "approved" : "pending", submittedBy: userId })
    .returning();
  return row;
}

export async function listHappeningsForOwner(status: "pending" | "approved" | "rejected" | "all" = "pending") {
  const db = await getDb();
  const rows = await db
    .select({ h: schema.happenings, email: schema.users.email })
    .from(schema.happenings)
    .leftJoin(schema.users, eq(schema.happenings.submittedBy, schema.users.id))
    .where(status === "all" ? sql`true` : eq(schema.happenings.status, status))
    .orderBy(desc(schema.happenings.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...present(r.h), status: r.h.status, submittedBy: r.email ?? null, createdAt: r.h.createdAt.toISOString() }));
}

export async function moderateHappening(id: string, decision: "approved" | "rejected") {
  const db = await getDb();
  await db.update(schema.happenings).set({ status: decision, updatedAt: new Date() }).where(eq(schema.happenings.id, id));
}

export async function pendingHappeningCount(): Promise<number> {
  const db = await getDb();
  const rows = await db.select({ id: schema.happenings.id }).from(schema.happenings).where(eq(schema.happenings.status, "pending"));
  return rows.length;
}
