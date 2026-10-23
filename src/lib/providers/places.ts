import { config, fetchWithTimeout, withFallback } from "../config";
import { CATEGORY_BY_ID, categorize } from "../categories";
import { DEMO_PLACES } from "../demo/data";
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
  const res = await fetchWithTimeout(config.overpassUrl, {
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
  return DEMO_PLACES.filter((p) => search.categories.includes(p.category)).map((p, i) => ({
    id: `demo-place-${i}`,
    name: p.name,
    category: p.category,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    website: p.website,
  }));
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
  const r = await withFallback("Places", () => livePlaces(search), () => demoPlaces(search));
  return { ...r, data: scopePlaces(r.data, search) };
}
