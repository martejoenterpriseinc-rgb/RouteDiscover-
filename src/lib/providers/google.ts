/**
 * Google Maps Platform providers: Places API (New), Routes API, Geocoding API.
 * Used first whenever the owner has entered a server key; every caller falls
 * back to the OpenStreetMap providers when a call fails.
 */
import { fetchWithTimeout, getProviderConfig, type GoogleConfig } from "../config";
import { consume } from "../usage";
import { decodePolyline, haversineMiles, indexRoute, pointAtMile, simplifyTo } from "../geo";
import type { CategoryId, GeoResult, LatLng, Place, RouteResult } from "../types";

/* ------------------------------------------------------------------ */
/* Category ↔ Google place types                                       */
/* ------------------------------------------------------------------ */

export const GOOGLE_TYPES: Record<CategoryId, string[]> = {
  buffets: ["buffet_restaurant"],
  food: ["restaurant", "meal_takeaway", "bakery", "ice_cream_shop", "sandwich_shop", "pizza_restaurant", "diner"],
  coffee: ["cafe", "coffee_shop"],
  attractions: ["tourist_attraction", "museum", "zoo", "aquarium", "art_gallery", "visitor_center"],
  outdoors: ["park", "national_park", "state_park", "garden", "beach"],
  historic: ["historical_place"],
  landmarks: ["historical_landmark", "monument", "cultural_landmark"],
  historic_buildings: ["historical_place"],
  souvenirs: ["gift_shop"],
  specialty: ["candy_store", "chocolate_shop", "cheese_shop", "deli", "wine_store", "liquor_store", "tea_house", "toy_store", "hobby_store", "art_studio", "butcher_shop", "farm"],
  shopping: ["shopping_mall", "department_store", "book_store", "clothing_store", "market"],
  antiques: ["antique_store", "thrift_store"],
  entertainment: ["movie_theater", "performing_arts_theater", "casino", "bowling_alley", "amusement_center"],
  kids: ["playground", "childrens_camp", "indoor_playground"],
  lodging: ["hotel", "motel", "lodging", "resort_hotel", "inn"],
  travel: ["truck_stop"],
  fuel: ["gas_station"],
  ev: ["electric_vehicle_charging_station"],
  rest: ["rest_stop"],
  restrooms: ["public_bathroom"],
  groceries: ["supermarket", "grocery_store", "pharmacy", "convenience_store"],
  campgrounds: ["campground", "rv_park"],
  wine: ["winery", "wine_bar", "bar"],
  flea: ["market"],
  fairgrounds: ["event_venue"],
  amusement: ["amusement_park", "water_park"],
  gokarts: ["adventure_sports_center", "amusement_center"],
  minigolf: ["miniature_golf_course"],
  golf: ["golf_course"],
  caves: ["tourist_attraction"],
  hiking: ["hiking_area"],
  biking: ["cycling_park"],
  hotsprings: ["spa", "tourist_attraction"],
  boating: ["marina"],
  offroad: ["off_roading_area"],
  bnb: ["bed_and_breakfast", "guest_house"],
  camping_free: ["campground", "rv_park"],
  spa: ["spa", "massage", "sauna", "wellness_center"],
};

/**
 * Place types the Places API (New) accepts in includedTypes. Anything outside this list is
 * dropped before a request so one unknown type can't fail the whole search.
 */
export const KNOWN_GOOGLE_TYPES = new Set([
  "restaurant", "meal_takeaway", "bakery", "ice_cream_shop", "sandwich_shop", "pizza_restaurant", "diner", "buffet_restaurant", "cafe", "coffee_shop", "bar", "wine_bar", "pub", "tea_house", "deli",
  "tourist_attraction", "museum", "zoo", "aquarium", "art_gallery", "amusement_park", "amusement_center", "visitor_center", "water_park", "adventure_sports_center", "event_venue", "movie_theater", "performing_arts_theater", "casino", "bowling_alley", "playground", "childrens_camp",
  "park", "national_park", "state_park", "hiking_area", "garden", "beach", "cycling_park", "off_roading_area", "marina", "golf_course", "miniature_golf_course", "campground", "rv_park",
  "historical_landmark", "historical_place", "monument", "cultural_landmark",
  "shopping_mall", "department_store", "gift_shop", "book_store", "clothing_store", "market", "antique_store", "thrift_store", "candy_store", "liquor_store", "butcher_shop", "art_studio",
  "hotel", "motel", "lodging", "resort_hotel", "bed_and_breakfast", "guest_house", "inn", "spa", "massage", "sauna", "wellness_center",
  "gas_station", "truck_stop", "electric_vehicle_charging_station", "rest_stop", "public_bathroom", "supermarket", "grocery_store", "pharmacy", "convenience_store",
]);

/** Reverse map: first category whose type list contains the place's primary type. */
export function categoryForTypes(types: string[]): CategoryId | null {
  const order = Object.keys(GOOGLE_TYPES) as CategoryId[];
  for (const t of types) {
    for (const cat of order) if (GOOGLE_TYPES[cat].includes(t)) return cat;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                        */
/* ------------------------------------------------------------------ */

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  googleMapsUri?: string;
  editorialSummary?: { text?: string };
  regularOpeningHours?: { weekdayDescriptions?: string[]; periods?: Array<{ open: { day: number; hour: number; minute: number }; close?: { day: number; hour: number; minute: number } }> };
  utcOffsetMinutes?: number;
  photos?: Array<{ name: string }>;
  reviews?: Array<{ rating?: number; text?: { text?: string }; relativePublishTimeDescription?: string; publishTime?: string; authorAttribution?: { displayName?: string } }>;
};

const SEARCH_FIELDS = "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType,places.rating,places.userRatingCount,places.priceLevel,places.websiteUri,places.nationalPhoneNumber,places.regularOpeningHours.weekdayDescriptions,places.regularOpeningHours.periods,places.utcOffsetMinutes,places.googleMapsUri";
const DETAIL_FIELDS = "id,displayName,formattedAddress,location,types,primaryType,rating,userRatingCount,priceLevel,websiteUri,nationalPhoneNumber,internationalPhoneNumber,regularOpeningHours.weekdayDescriptions,regularOpeningHours.periods,utcOffsetMinutes,googleMapsUri,editorialSummary,photos.name,reviews";

async function google<T>(url: string, key: string, init: RequestInit & { fieldMask?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { "X-Goog-Api-Key": key, "Content-Type": "application/json" };
  if (init.fieldMask) headers["X-Goog-FieldMask"] = init.fieldMask;
  const res = await fetchWithTimeout(url, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google HTTP ${res.status}${body ? `: ${body.slice(0, 160)}` : ""}`);
  }
  return (await res.json()) as T;
}

export function toPlace(p: GooglePlace): Place | null {
  if (!p.location || !p.id) return null;
  const types = [p.primaryType ?? "", ...(p.types ?? [])].filter(Boolean);
  const category = categoryForTypes(types) ?? "attractions";
  const reviews = (p.reviews ?? [])
    .filter((r) => r.text?.text)
    .slice(0, 5)
    .map((r) => ({ author: r.authorAttribution?.displayName ?? "Google user", rating: r.rating ?? 0, text: r.text?.text ?? "", time: r.relativePublishTimeDescription ?? r.publishTime ?? "" }));
  return {
    id: `google-${p.id}`,
    name: p.displayName?.text ?? "Unnamed place",
    category,
    lat: p.location.latitude,
    lng: p.location.longitude,
    address: p.formattedAddress,
    website: p.websiteUri,
    phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber,
    openingHours: p.regularOpeningHours?.weekdayDescriptions?.join("; "),
    tags: { google_types: types.join(",") },
    provider: "google",
    google: {
      rating: p.rating,
      ratingCount: p.userRatingCount,
      priceLevel: p.priceLevel,
      summary: p.editorialSummary?.text,
      mapsUri: p.googleMapsUri,
      photoNames: p.photos?.map((x) => x.name).slice(0, 10),
      reviews: reviews.length ? reviews : undefined,
      periods: p.regularOpeningHours?.periods,
      utcOffsetMinutes: p.utcOffsetMinutes,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Places                                                              */
/* ------------------------------------------------------------------ */

const MAX_RADIUS_M = 50_000;
const cache = new Map<string, { at: number; data: Place[] }>();
const CACHE_TTL_MS = 60 * 60_000;

let capFor = { places: 0, routes: 0, geocoding: 0, photos: 0 };

async function nearby(key: string, center: LatLng, radiusM: number, types: string[]): Promise<Place[]> {
  const cacheKey = `${center.lat.toFixed(3)},${center.lng.toFixed(3)},${radiusM},${types.join("|")}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  const out: Place[] = [];
  // Nearby Search allows up to 50 included types per request.
  for (let i = 0; i < types.length; i += 50) {
    await consume("google", "places", capFor.places);
    const json = await google<{ places?: GooglePlace[] }>("https://places.googleapis.com/v1/places:searchNearby", key, {
      method: "POST",
      fieldMask: SEARCH_FIELDS,
      body: JSON.stringify({
        includedTypes: types.slice(i, i + 50),
        maxResultCount: 20,
        rankPreference: "POPULARITY",
        locationRestriction: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: Math.min(MAX_RADIUS_M, Math.max(50, radiusM)) } },
      }),
    });
    for (const p of json.places ?? []) {
      const place = toPlace(p);
      if (place) out.push(place);
    }
  }
  cache.set(cacheKey, { at: Date.now(), data: out });
  return out;
}

/** Points along the route spaced so their circles cover the corridor, capped by the owner's request budget. */
export function samplePoints(route: LatLng[], radiusMiles: number, maxPoints: number): { points: LatLng[]; radiusMiles: number } {
  const idx = indexRoute(simplifyTo(route, 400));
  const total = idx.totalMiles;
  const radiusCapMiles = MAX_RADIUS_M / 1609.344;
  let r = Math.min(radiusMiles, radiusCapMiles);
  let spacing = r * 1.6;
  let n = Math.max(1, Math.ceil(total / spacing));
  if (n > maxPoints) {
    n = maxPoints;
    spacing = total / n;
    r = Math.min(radiusCapMiles, Math.max(r, spacing / 1.6));
  }
  const points: LatLng[] = [];
  for (let i = 0; i < n; i++) points.push(pointAtMile(idx, Math.min(total, i * spacing + spacing / 2)));
  return { points, radiusMiles: r };
}

export async function googlePlaces(cfg: GoogleConfig, search: { kind: "point"; center: LatLng; radiusMiles: number; categories: CategoryId[] } | { kind: "corridor"; route: LatLng[]; radiusMiles: number; categories: CategoryId[] }): Promise<Place[]> {
  if (!cfg.places) throw new Error("Google Places not enabled");
  capFor = cfg.caps;
  const types = Array.from(new Set(search.categories.flatMap((c) => GOOGLE_TYPES[c]))).filter((t) => KNOWN_GOOGLE_TYPES.has(t));
  const seen = new Map<string, Place>();
  const add = (list: Place[]) => {
    for (const p of list) if (!seen.has(p.id) && search.categories.includes(p.category)) seen.set(p.id, p);
  };
  if (search.kind === "point") {
    add(await nearby(cfg.serverKey, search.center, search.radiusMiles * 1609.344, types));
  } else {
    // Each sample point costs one request per 50 types, so share the budget across both.
    const chunks = Math.max(1, Math.ceil(types.length / 50));
    const { points, radiusMiles } = samplePoints(search.route, search.radiusMiles, Math.max(1, Math.floor(cfg.maxRequestsPerSearch / chunks)));
    const results = await Promise.all(points.map((pt) => nearby(cfg.serverKey, pt, radiusMiles * 1609.344, types).catch(() => [] as Place[])));
    results.forEach(add);
    if (seen.size === 0 && results.every((r) => r.length === 0)) throw new Error("Google Places returned nothing for this corridor");
  }
  return [...seen.values()];
}

export async function googleLookup(cfg: GoogleConfig, id: string): Promise<Place | null> {
  const m = /^google-(.+)$/.exec(id);
  if (!m) throw new Error("not a Google place id");
  if (!cfg.serverKey) throw new Error("Google key not configured");
  await consume("google", "places", cfg.caps.places);
  const json = await google<GooglePlace>(`https://places.googleapis.com/v1/places/${encodeURIComponent(m[1])}`, cfg.serverKey, { fieldMask: DETAIL_FIELDS });
  return toPlace(json);
}

/** Resolve a Google photo reference to image bytes (used by the photo proxy). */
export async function googlePhoto(photoName: string, maxWidthPx: number): Promise<Response> {
  const cfg = await getProviderConfig();
  if (!cfg.google.serverKey) throw new Error("Google key not configured");
  await consume("google", "photos", cfg.google.caps.photos);
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${Math.min(1600, Math.max(100, maxWidthPx))}&key=${encodeURIComponent(cfg.google.serverKey)}`;
  const res = await fetchWithTimeout(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Google photo HTTP ${res.status}`);
  return res;
}

/* ------------------------------------------------------------------ */
/* Geocoding & routing                                                 */
/* ------------------------------------------------------------------ */

export async function googleGeocode(cfg: GoogleConfig, q: string, limit: number): Promise<GeoResult[]> {
  if (!cfg.geocoding) throw new Error("Google Geocoding not enabled");
  await consume("google", "geocoding", cfg.caps.geocoding);
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", q);
  url.searchParams.set("region", "us");
  url.searchParams.set("key", cfg.serverKey);
  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) throw new Error(`Google HTTP ${res.status}`);
  const json = (await res.json()) as { status: string; results?: Array<{ formatted_address: string; geometry: { location: { lat: number; lng: number } } }> };
  if (json.status !== "OK" && json.status !== "ZERO_RESULTS") throw new Error(`Google geocoding ${json.status}`);
  return (json.results ?? []).slice(0, limit).map((r) => ({ label: r.formatted_address.replace(/, USA$/, ""), lat: r.geometry.location.lat, lng: r.geometry.location.lng }));
}

export async function googleRoute(cfg: GoogleConfig, origin: GeoResult, destination: GeoResult, via: GeoResult[] = []): Promise<Omit<RouteResult, "source">> {
  if (!cfg.routing) throw new Error("Google Routes not enabled");
  await consume("google", "routes", cfg.caps.routes);
  const json = await google<{ routes?: Array<{ distanceMeters: number; duration: string; polyline: { encodedPolyline: string } }> }>("https://routes.googleapis.com/directions/v2:computeRoutes", cfg.serverKey, {
    method: "POST",
    fieldMask: "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      ...(via.length ? { intermediates: via.map((p) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } })) } : {}),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      polylineQuality: "HIGH_QUALITY",
    }),
  });
  const r = json.routes?.[0];
  if (!r) throw new Error("Google returned no route");
  const geometry = decodePolyline(r.polyline.encodedPolyline);
  if (geometry.length < 2) throw new Error("Google route had no geometry");
  const distanceMiles = r.distanceMeters / 1609.344;
  const seconds = Number(String(r.duration).replace(/s$/, "")) || (distanceMiles / 62) * 3600;
  return { geometry, distanceMiles, durationMinutes: seconds / 60, origin, destination, via };
}

export const milesBetween = haversineMiles;
