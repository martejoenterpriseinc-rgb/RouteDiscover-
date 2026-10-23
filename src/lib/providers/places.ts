import { fetchWithTimeout, getProviderConfig, withFallback } from "../config";
import { CATEGORY_BY_ID, categorize } from "../categories";
import { DEMO_HOTELS, DEMO_PLACES, DEMO_SUPERCHARGERS } from "../demo/data";
import { googleLookup, googlePlaces } from "./google";
import { METERS_PER_MILE, distanceToRoute, haversineMiles, indexRoute, simplifyTo } from "../geo";
import type { CategoryId, LatLng, Place } from "../types";

export type PlaceSearch =
  | { kind: "corridor"; route: LatLng[]; radiusMiles: number; categories: CategoryId[]; limit?: number }
  | { kind: "point"; center: LatLng; radiusMiles: number; categories: CategoryId[]; limit?: number };

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const MAX_CORRIDOR_POINTS = 120;

function buildOverpassQuery(search: PlaceSearch): string {
  const radiusM = Math.round(search.radiusMiles * METERS_PER_MILE);
  const around =
    search.kind === "point"
      ? `(around:${radiusM},${search.center.lat.toFixed(5)},${search.center.lng.toFixed(5)})`
      : `(around:${radiusM},${simplifyTo(search.route, MAX_CORRIDOR_POINTS)
          .map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
          .join(",")})`;
  const selectors = search.categories.flatMap((id) => CATEGORY_BY_ID[id].osm);
  const body = selectors.map((sel) => `nwr${sel}["name"]${around};`).join("\n");
  const limit = search.limit ?? 400;
  return `[out:json][timeout:40];(\n${body}\n);out center tags ${limit};`;
}

function addressOf(t: Record<string, string>): string | undefined {
  const street = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
  const city = [t["addr:city"], t["addr:state"]].filter(Boolean).join(", ");
  const out = [street, city].filter(Boolean).join(", ");
  return out || undefined;
}

async function livePlaces(search: PlaceSearch): Promise<Place[]> {
  const q = buildOverpassQuery(search);
  const cfg = await getProviderConfig();
  const res = await fetchWithTimeout(cfg.overpassUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(q)}`,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { elements: OverpassElement[] };
  const places: Place[] = [];
  for (const el of json.elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const tags = el.tags ?? {};
    if (lat == null || lng == null || !tags.name) continue;
    const category = categorize(tags);
    if (!category || !search.categories.includes(category)) continue;
    places.push({
      id: `osm-${el.type}-${el.id}`,
      name: tags.name,
      category,
      lat,
      lng,
      address: addressOf(tags),
      website: tags.website || tags["contact:website"],
      phone: tags.phone || tags["contact:phone"],
      openingHours: tags.opening_hours,
      tags,
    });
  }
  return places;
}

function demoPlaces(search: PlaceSearch): Place[] {
  // Ids use the position in DEMO_PLACES so they stay stable across category filters.
  return DEMO_PLACES.map((p, i) => ({
    id: `demo-place-${i}`,
    name: p.name,
    category: p.category,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
      openingHours: p.openingHours,
      tags: p.tags,
    website: p.website,
  })).filter((p) => search.categories.includes(p.category));
}

/** Attach distance fields and drop anything outside the search area. */
export function scopePlaces<T extends LatLng>(items: T[], search: PlaceSearch): T[] {
  if (search.kind === "point") {
    return items
      .map((p) => ({ ...p, distanceMiles: haversineMiles(search.center, p) }))
      .filter((p) => p.distanceMiles <= search.radiusMiles)
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
  }
  const idx = indexRoute(simplifyTo(search.route, 600));
  return items
    .map((p) => ({ ...p, ...distanceToRoute(p, idx) }))
    .filter((p) => p.detourMiles <= search.radiusMiles)
    .sort((a, b) => a.alongMiles - b.alongMiles);
}

export async function searchPlaces(search: PlaceSearch) {
  const cfg = await getProviderConfig();
  const primary = cfg.google.places ? { name: "Google Places", run: () => googlePlaces(cfg.google, search) } : null;
  const r = await withFallback("Places", () => livePlaces(search), () => demoPlaces(search), primary);
  return { ...r, data: scopePlaces(r.data, search) };
}

/* ------------------------------------------------------------------ */
/* Lookup a single place by provider id (used by listings & sync)      */
/* ------------------------------------------------------------------ */

async function liveLookup(id: string): Promise<Place | null> {
  const m = /^osm-(node|way|relation)-(\d+)$/.exec(id);
  if (!m) throw new Error("not an OpenStreetMap id");
  const cfg = await getProviderConfig();
  const q = `[out:json][timeout:20];${m[1]}(${m[2]});out center tags;`;
  const res = await fetchWithTimeout(cfg.overpassUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(q)}`,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { elements: OverpassElement[] };
  const el = json.elements[0];
  if (!el) return null;
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  const tags = el.tags ?? {};
  if (lat == null || lng == null) return null;
  return {
    id,
    name: tags.name ?? "Unnamed place",
    category: categorize(tags) ?? "attractions",
    lat,
    lng,
    address: addressOf(tags),
    website: tags.website || tags["contact:website"],
    phone: tags.phone || tags["contact:phone"],
    openingHours: tags.opening_hours,
    tags,
    provider: "osm",
  };
}

function demoLookup(id: string): Place | null {
  let m = /^demo-place-(\d+)$/.exec(id);
  if (m) {
    const p = DEMO_PLACES[Number(m[1])];
    return p ? { id, name: p.name, category: p.category, lat: p.lat, lng: p.lng, address: p.address, website: p.website } : null;
  }
  m = /^demo-hotel-(\d+)$/.exec(id);
  if (m) {
    const h = DEMO_HOTELS[Number(m[1])];
    return h ? { id, name: h.name, category: h.kind === "campground" ? "campgrounds" : "lodging", lat: h.lat, lng: h.lng, address: h.address } : null;
  }
  m = /^demo-sc-(\d+)$/.exec(id);
  if (m) {
    const c = DEMO_SUPERCHARGERS[Number(m[1])];
    return c ? { id, name: c.name, category: "ev", lat: c.lat, lng: c.lng, address: c.address } : null;
  }
  return null;
}

export async function lookupPlace(id: string) {
  if (id.startsWith("demo-")) return { source: "demo" as const, data: demoLookup(id) };
  if (id.startsWith("google-")) {
    const cfg = await getProviderConfig();
    return withFallback("Google Places", () => googleLookup(cfg.google, id), () => null);
  }
  return withFallback("Places", () => liveLookup(id), () => demoLookup(id));
}
