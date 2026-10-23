import { config, fetchWithTimeout, withFallback } from "../config";
import { DEMO_HOTELS, DEMO_SUPERCHARGERS } from "../demo/data";
import { encodePolyline, haversineMiles, simplifyTo } from "../geo";
import type { Charger, Hotel, LatLng, Place } from "../types";
import { scopePlaces, searchPlaces, type PlaceSearch } from "./places";

export type ChargerSearch =
  | { kind: "corridor"; route: LatLng[]; radiusMiles: number }
  | { kind: "point"; center: LatLng; radiusMiles: number };

/* ------------------------------------------------------------------ */
/* Open Charge Map                                                     */
/* ------------------------------------------------------------------ */

type OcmPoi = {
  ID: number;
  AddressInfo?: {
    Title?: string;
    AddressLine1?: string;
    Town?: string;
    StateOrProvince?: string;
    Latitude: number;
    Longitude: number;
  };
  OperatorInfo?: { ID?: number; Title?: string } | null;
  UsageType?: { ID?: number; Title?: string; IsPayAtLocation?: boolean | null } | null;
  UsageCost?: string | null;
  NumberOfPoints?: number | null;
  Connections?: Array<{
    ConnectionType?: { ID?: number; Title?: string } | null;
    Level?: { ID?: number; Title?: string } | null;
    PowerKW?: number | null;
    Quantity?: number | null;
  }>;
};

const FREE_RE = /(\bfree\b|\bno charge\b|\bcomplimentary\b|\bno cost\b|\$0(?:\.00)?(?!\d))/i;
const PAID_RE = /(\$\s?\d|\d\s?(?:¢|cents)|per\s?(?:kwh|hour|min)|\/\s?(?:kwh|hr|hour|min)|fee|paid|pay)/i;
const HOTEL_NAME_RE =
  /\b(hotel|inn\b|suites|resort|lodge|motel|marriott|hilton|hampton|holiday inn|courtyard|hyatt|sheraton|westin|doubletree|residence inn|fairfield|comfort inn|best western|la quinta|quality inn|days inn|embassy suites|homewood|springhill|towneplace|candlewick|staybridge|wyndham|ramada|super 8|red roof|drury|omni|kimpton|b&b|bed and breakfast)\b/i;

export function classifyCost(cost: string | null | undefined, payAtLocation?: boolean | null): Charger["costTier"] {
  const c = (cost ?? "").trim();
  if (c && FREE_RE.test(c) && !PAID_RE.test(c.replace(FREE_RE, ""))) return "free";
  if (c && PAID_RE.test(c)) return "paid";
  if (payAtLocation) return "paid";
  return "unknown";
}

type RawCharger = Charger & { usageTypeId?: number };

function ocmToCharger(p: OcmPoi): RawCharger | null {
  const a = p.AddressInfo;
  if (!a) return null;
  const operator = p.OperatorInfo?.Title ?? undefined;
  const isTesla = /tesla/i.test(operator ?? "");
  const conns = p.Connections ?? [];
  const connectors = Array.from(
    new Set(conns.map((c) => c.ConnectionType?.Title).filter((t): t is string => !!t)),
  );
  const maxKw = conns.reduce((m, c) => Math.max(m, c.PowerKW ?? 0), 0) || undefined;
  const isFast = conns.some((c) => c.Level?.ID === 3 || (c.PowerKW ?? 0) >= 50);
  const title = a.Title ?? "Charging station";
  const supercharger = isTesla && (isFast || /supercharger/i.test(title) || connectors.some((c) => /supercharger/i.test(c)));
  return {
    id: `ocm-${p.ID}`,
    name: title,
    lat: a.Latitude,
    lng: a.Longitude,
    operator,
    network: isTesla ? "tesla" : "other",
    supercharger,
    stalls: p.NumberOfPoints ?? undefined,
    maxKw,
    address: [a.AddressLine1, a.Town, a.StateOrProvince].filter(Boolean).join(", ") || undefined,
    cost: p.UsageCost ?? undefined,
    costTier: classifyCost(p.UsageCost, p.UsageType?.IsPayAtLocation),
    connectors,
    usageTypeId: p.UsageType?.ID,
  };
}

async function liveOcm(search: ChargerSearch, opts: { teslaOnly: boolean }): Promise<RawCharger[]> {
  const url = new URL(`${config.openChargeMapUrl}/poi/`);
  url.searchParams.set("output", "json");
  url.searchParams.set("compact", "false");
  url.searchParams.set("verbose", "false");
  url.searchParams.set("maxresults", "500");
  url.searchParams.set("countrycode", "US");
  url.searchParams.set("distanceunit", "miles");
  url.searchParams.set("distance", String(search.radiusMiles));
  if (search.kind === "point") {
    url.searchParams.set("latitude", search.center.lat.toFixed(5));
    url.searchParams.set("longitude", search.center.lng.toFixed(5));
  } else {
    url.searchParams.set("polyline", encodePolyline(simplifyTo(search.route, 100)));
  }
  if (opts.teslaOnly) {
    // 23 = Tesla (Tesla-only charging), 3534 = Tesla (including non-Tesla)
    url.searchParams.set("operatorid", "23,3534");
    url.searchParams.set("levelid", "3");
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.openChargeMapKey) headers["X-API-Key"] = config.openChargeMapKey;
  const res = await fetchWithTimeout(url.toString(), { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const pois = (await res.json()) as OcmPoi[];
  return pois.map(ocmToCharger).filter((c): c is RawCharger => !!c);
}

/* ------------------------------------------------------------------ */
/* Superchargers                                                       */
/* ------------------------------------------------------------------ */

function demoSuperchargers(): Charger[] {
  return DEMO_SUPERCHARGERS.map((s, i) => ({
    id: `demo-sc-${i}`,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    operator: "Tesla",
    network: "tesla" as const,
    supercharger: true,
    stalls: s.stalls,
    maxKw: s.maxKw,
    address: s.address,
    cost: "Pay per kWh (Tesla app)",
    costTier: "paid" as const,
    connectors: ["Tesla Supercharger (NACS)"],
  }));
}

function toPlaceSearch(search: ChargerSearch): PlaceSearch {
  return search.kind === "point"
    ? { kind: "point", center: search.center, radiusMiles: search.radiusMiles, categories: [] }
    : { kind: "corridor", route: search.route, radiusMiles: search.radiusMiles, categories: [] };
}

export async function searchSuperchargers(search: ChargerSearch) {
  const r = await withFallback(
    "Open Charge Map",
    async () =>
      (await liveOcm(search, { teslaOnly: true }))
        .filter((c) => c.supercharger)
        .map((c) => {
          const { usageTypeId, ...rest } = c;
          void usageTypeId;
          return rest;
        }),
    demoSuperchargers,
  );
  return { ...r, data: scopePlaces(r.data, toPlaceSearch(search)) };
}

/* ------------------------------------------------------------------ */
/* Hotels with chargers                                                */
/* ------------------------------------------------------------------ */

const MATCH_MILES = 0.12; // ~200 m: charger is "at" the hotel

function osmConnectors(tags: Record<string, string>): string[] {
  const names: Record<string, string> = {
    "socket:tesla_destination": "Tesla Destination",
    "socket:tesla_supercharger": "Tesla Supercharger",
    "socket:nacs": "NACS",
    "socket:type1": "J1772",
    "socket:type1_combo": "CCS1",
    "socket:chademo": "CHAdeMO",
    "socket:type2": "Type 2",
  };
  return Object.keys(tags)
    .filter((k) => k.startsWith("socket:") && tags[k] !== "no" && !k.includes(":output"))
    .map((k) => names[k] ?? k.replace("socket:", ""))
    .filter((v, i, a) => a.indexOf(v) === i);
}

function osmChargerTier(tags: Record<string, string>): Hotel["chargerTier"] {
  if (tags.fee === "no") return "free";
  if (tags.fee === "yes") return "paid";
  return classifyCost(tags.charge);
}

function osmChargerAccess(tags: Record<string, string>): Hotel["chargerAccess"] {
  if (tags.access === "customers" || tags.access === "private") return "guests";
  if (tags.access === "yes" || tags.access === "public" || tags.access === "permissive") return "public";
  return "unknown";
}

/** Open Charge Map UsageType IDs: 1 public, 4 membership, 5 pay at location, 7 notice required; 2/3/6 restricted. */
function ocmAccess(usageTypeId?: number): Hotel["chargerAccess"] {
  if (usageTypeId === 6 || usageTypeId === 2 || usageTypeId === 3) return "guests";
  if (usageTypeId === 1 || usageTypeId === 4 || usageTypeId === 5 || usageTypeId === 7) return "public";
  return "unknown";
}

function hotelFromPlace(p: Place): Hotel {
  const t = p.tags ?? {};
  return {
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    website: p.website,
    phone: p.phone,
    stars: t.stars,
    brand: t.brand,
    hasCharger: false,
    chargerTier: "unknown",
    chargerAccess: "unknown",
    teslaDestination: false,
    connectors: [],
  };
}

function mergeTier(a: Hotel["chargerTier"], b: Hotel["chargerTier"]): Hotel["chargerTier"] {
  if (a === "free" || b === "free") return "free";
  if (a === "paid" || b === "paid") return "paid";
  return "unknown";
}

function mergeAccess(a: Hotel["chargerAccess"], b: Hotel["chargerAccess"]): Hotel["chargerAccess"] {
  if (a === "public" || b === "public") return "public";
  if (a === "guests" || b === "guests") return "guests";
  return "unknown";
}

async function liveHotels(search: ChargerSearch): Promise<Hotel[]> {
  const ps = toPlaceSearch(search);
  const [placesRes, ocm] = await Promise.all([
    searchPlaces({ ...ps, categories: ["lodging", "ev"], limit: 800 }),
    liveOcm(search, { teslaOnly: false }).catch(() => [] as RawCharger[]),
  ]);
  if (placesRes.source !== "live") throw new Error("places provider unavailable");
  const hotels = new Map<string, Hotel>();
  const osmChargers: Place[] = [];
  for (const p of placesRes.data) {
    if (p.category === "lodging") hotels.set(p.id, hotelFromPlace(p));
    else if (p.category === "ev") osmChargers.push(p);
  }
  const list = Array.from(hotels.values());
  const nearestHotel = (pt: LatLng): Hotel | null => {
    let best: Hotel | null = null;
    let bestD = MATCH_MILES;
    for (const h of list) {
      const d = haversineMiles(pt, h);
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
    return best;
  };

  // OSM charging stations sitting on a hotel.
  for (const c of osmChargers) {
    const t = c.tags ?? {};
    const h = nearestHotel(c);
    if (!h) continue;
    const conns = osmConnectors(t);
    h.hasCharger = true;
    h.chargerTier = mergeTier(h.chargerTier, osmChargerTier(t));
    h.chargerAccess = mergeAccess(h.chargerAccess, osmChargerAccess(t));
    h.teslaDestination ||= conns.some((x) => /tesla destination|nacs/i.test(x));
    h.connectors = Array.from(new Set([...h.connectors, ...conns]));
    if (t.capacity) h.chargerCount = (h.chargerCount ?? 0) + Number(t.capacity) || h.chargerCount;
    if (t.charge) h.chargerNotes = t.charge;
  }

  // Open Charge Map entries: match to a hotel, or create one if the entry is clearly a hotel.
  for (const c of ocm) {
    if (c.supercharger) continue;
    let h = nearestHotel(c);
    if (!h && HOTEL_NAME_RE.test(c.name)) {
      h = {
        id: c.id,
        name: c.name.replace(/\s*[-–(].*$/, "").trim() || c.name,
        lat: c.lat,
        lng: c.lng,
        address: c.address,
        hasCharger: false,
        chargerTier: "unknown",
        chargerAccess: "unknown",
        teslaDestination: false,
        connectors: [],
      };
      hotels.set(h.id, h);
      list.push(h);
    }
    if (!h) continue;
    h.hasCharger = true;
    h.chargerTier = mergeTier(h.chargerTier, c.costTier);
    h.chargerAccess = mergeAccess(h.chargerAccess, ocmAccess(c.usageTypeId));
    const tesla = c.network === "tesla" || c.connectors.some((x) => /tesla|nacs/i.test(x));
    h.teslaDestination ||= tesla;
    h.connectors = Array.from(new Set([...h.connectors, ...c.connectors]));
    if (c.stalls) h.chargerCount = (h.chargerCount ?? 0) + c.stalls;
    if (c.cost) h.chargerNotes = c.cost;
  }
  return list;
}

function demoHotels(): Hotel[] {
  return DEMO_HOTELS.map((h, i) => ({ id: `demo-hotel-${i}`, ...h }));
}

export async function searchHotels(search: ChargerSearch) {
  const r = await withFallback("Hotels", () => liveHotels(search), demoHotels);
  return { ...r, data: scopePlaces(r.data, toPlaceSearch(search)) };
}
