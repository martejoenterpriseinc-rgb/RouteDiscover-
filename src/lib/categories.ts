import type { Category, CategoryId } from "./types";

export const CATEGORIES: Category[] = [
  {
    id: "food",
    label: "Food",
    emoji: "🍽️",
    osm: [`["amenity"~"^(restaurant|fast_food|food_court|ice_cream)$"]`, `["shop"="bakery"]`],
    walkable: true,
  },
  {
    id: "coffee",
    label: "Coffee",
    emoji: "☕",
    osm: [`["amenity"="cafe"]`, `["shop"="coffee"]`],
    walkable: true,
  },
  {
    id: "attractions",
    label: "Attractions",
    emoji: "🎡",
    osm: [`["tourism"~"^(attraction|museum|zoo|theme_park|aquarium|viewpoint|gallery|artwork)$"]`],
  },
  {
    id: "outdoors",
    label: "Outdoors",
    emoji: "🌲",
    osm: [
      `["leisure"~"^(park|nature_reserve|garden)$"]["name"]`,
      `["boundary"="national_park"]`,
      `["natural"~"^(beach|waterfall|peak)$"]["name"]`,
    ],
    walkable: true,
  },
  {
    id: "historic",
    label: "Historic",
    emoji: "🏛️",
    osm: [`["historic"]["name"]`],
  },
  {
    id: "shopping",
    label: "Shopping",
    emoji: "🛍️",
    osm: [`["shop"~"^(mall|department_store|outlet|gift|books|clothes|farm)$"]`],
    walkable: true,
  },
  {
    id: "antiques",
    label: "Antiques & Thrift",
    emoji: "🪑",
    osm: [`["shop"~"^(antiques|second_hand|charity|auction)$"]`, `["amenity"="marketplace"]`],
  },
  {
    id: "entertainment",
    label: "Entertainment",
    emoji: "🎭",
    osm: [`["amenity"~"^(theatre|cinema|casino|arts_centre)$"]`, `["leisure"~"^(bowling_alley|amusement_arcade)$"]`],
  },
  {
    id: "kids",
    label: "Kids",
    emoji: "🧒",
    osm: [`["leisure"~"^(playground|water_park|trampoline_park)$"]`, `["tourism"="theme_park"]`],
  },
  {
    id: "lodging",
    label: "Hotels",
    emoji: "🏨",
    osm: [`["tourism"~"^(hotel|motel|resort)$"]`],
  },
  {
    id: "fuel",
    label: "Gas",
    emoji: "⛽",
    osm: [`["amenity"="fuel"]`],
  },
  {
    id: "ev",
    label: "EV Charging",
    emoji: "🔌",
    osm: [`["amenity"="charging_station"]`],
  },
  {
    id: "rest",
    label: "Rest Areas",
    emoji: "🅿️",
    osm: [`["highway"~"^(rest_area|services)$"]`],
  },
  {
    id: "restrooms",
    label: "Restrooms",
    emoji: "🚻",
    osm: [`["amenity"="toilets"]`],
    walkable: true,
  },
  {
    id: "campgrounds",
    label: "Campgrounds",
    emoji: "🏕️",
    osm: [`["tourism"~"^(camp_site|caravan_site)$"]`],
  },
  {
    id: "groceries",
    label: "Groceries & Pharmacy",
    emoji: "🛒",
    osm: [`["shop"~"^(supermarket|convenience)$"]`, `["amenity"="pharmacy"]`],
    walkable: true,
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

export const DEFAULT_ROUTE_CATEGORIES: CategoryId[] = [
  "attractions",
  "food",
  "outdoors",
  "historic",
];

export const WALKABLE_CATEGORIES: CategoryId[] = CATEGORIES.filter((c) => c.walkable).map(
  (c) => c.id,
);

export function isCategoryId(v: string): v is CategoryId {
  return v in CATEGORY_BY_ID;
}

export function parseCategories(raw: string | null | undefined): CategoryId[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(isCategoryId);
}

/**
 * Best-effort mapping of an OSM tag set back to one of our categories.
 * Order matters: first match wins.
 */
export function categorize(tags: Record<string, string>): CategoryId | null {
  const t = tags;
  if (t.amenity === "charging_station") return "ev";
  if (t.amenity === "fuel") return "fuel";
  if (t.amenity === "toilets") return "restrooms";
  if (t.highway === "rest_area" || t.highway === "services") return "rest";
  if (["hotel", "motel", "resort"].includes(t.tourism ?? "")) return "lodging";
  if (["camp_site", "caravan_site"].includes(t.tourism ?? "")) return "campgrounds";
  if (t.amenity === "cafe" || t.shop === "coffee") return "coffee";
  if (["restaurant", "fast_food", "food_court", "ice_cream"].includes(t.amenity ?? "") || t.shop === "bakery")
    return "food";
  if (["antiques", "second_hand", "charity", "auction"].includes(t.shop ?? "") || t.amenity === "marketplace")
    return "antiques";
  if (["playground", "water_park", "trampoline_park"].includes(t.leisure ?? "")) return "kids";
  if (["theatre", "cinema", "casino", "arts_centre"].includes(t.amenity ?? "") || ["bowling_alley", "amusement_arcade"].includes(t.leisure ?? ""))
    return "entertainment";
  if (["supermarket", "convenience"].includes(t.shop ?? "") || t.amenity === "pharmacy") return "groceries";
  if (["mall", "department_store", "outlet", "gift", "books", "clothes", "farm"].includes(t.shop ?? ""))
    return "shopping";
  if (t.historic) return "historic";
  if (["park", "nature_reserve", "garden"].includes(t.leisure ?? "") || t.boundary === "national_park" || ["beach", "waterfall", "peak"].includes(t.natural ?? ""))
    return "outdoors";
  if (["attraction", "museum", "zoo", "theme_park", "aquarium", "viewpoint", "gallery", "artwork"].includes(t.tourism ?? ""))
    return "attractions";
  return null;
}
