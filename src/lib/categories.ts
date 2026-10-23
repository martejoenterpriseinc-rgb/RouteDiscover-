import type { Category, CategoryGroupId, CategoryId } from "./types";

export const CATEGORIES: Category[] = [
  {
    id: "food",
    label: "Food",
    emoji: "🍽️",
    group: "food",
    osm: [`["amenity"~"^(restaurant|fast_food|food_court|ice_cream)$"]`, `["shop"="bakery"]`],
    walkable: true,
  },
  {
    id: "buffets",
    label: "Buffets",
    emoji: "🍛",
    group: "food",
    osm: [
      `["amenity"="restaurant"]["cuisine"~"buffet|smorgasbord|all_you_can_eat",i]`,
      `["amenity"="restaurant"]["name"~"Buffet|Smorgasbord|Golden Corral|Hometown|Cicis|Sizzler|Souper|Pizza Ranch|Fresh Choice",i]`,
    ],
    walkable: true,
  },
  {
    id: "coffee",
    label: "Coffee",
    emoji: "☕",
    group: "food",
    osm: [`["amenity"="cafe"]`, `["shop"="coffee"]`],
    walkable: true,
  },
  {
    id: "attractions",
    label: "Attractions",
    emoji: "🎡",
    group: "fun",
    osm: [`["tourism"~"^(attraction|museum|zoo|theme_park|aquarium|viewpoint|gallery|artwork)$"]`],
  },
  {
    id: "outdoors",
    label: "Outdoors",
    emoji: "🌲",
    group: "outdoors",
    osm: [
      `["leisure"~"^(park|nature_reserve|garden)$"]["name"]`,
      `["boundary"="national_park"]`,
      `["natural"~"^(beach|waterfall|peak)$"]["name"]`,
    ],
    walkable: true,
  },
  {
    id: "historic",
    label: "Historic Sites",
    emoji: "🏛️",
    group: "fun",
    hint: "Battlefields, historic districts, archaeological sites and other places with a story",
    osm: [`["historic"]["name"]`],
  },
  {
    id: "landmarks",
    label: "Landmarks & Monuments",
    emoji: "🗽",
    group: "fun",
    hint: "Monuments, memorials, statues, lighthouses, towers and the famous things worth a photo",
    osm: [`["historic"~"^(monument|memorial|statue|wayside_cross|boundary_stone)$"]["name"]`, `["man_made"~"^(lighthouse|tower|obelisk)$"]["name"]`, `["tourism"="attraction"]["landmark"]`],
  },
  {
    id: "historic_buildings",
    label: "Historic Buildings",
    emoji: "🏰",
    group: "fun",
    hint: "Castles, mansions, courthouses, mills, forts, old churches and heritage architecture",
    osm: [`["historic"~"^(building|castle|manor|fort|house|mansion|courthouse|mill|farm|church|city_gate|tower|hotel|railway_station|lighthouse)$"]["name"]`, `["heritage"]["building"]["name"]`],
  },
  {
    id: "shopping",
    label: "Shopping",
    emoji: "🛍️",
    group: "shopping",
    osm: [`["shop"~"^(mall|department_store|outlet|books|clothes|farm)$"]`],
    walkable: true,
  },
  {
    id: "souvenirs",
    label: "Souvenirs & Gifts",
    emoji: "🎁",
    group: "shopping",
    osm: [`["shop"~"^(gift|souvenir|craft)$"]`, `["shop"]["name"~"Souvenir|Gift|Trading Post|General Store",i]`],
    walkable: true,
  },
  {
    id: "specialty",
    label: "Specialty Shops",
    emoji: "🧀",
    group: "shopping",
    osm: [`["shop"~"^(chocolate|candy|confectionery|cheese|deli|wine|tea|spices|toys|games|hobby|music|art|boutique|pottery|leather|honey|nuts|farm)$"]`],
    walkable: true,
  },
  {
    id: "antiques",
    label: "Antiques & Thrift",
    emoji: "🪑",
    group: "shopping",
    osm: [`["shop"~"^(antiques|second_hand|charity|auction)$"]`, `["shop"]["name"~"Antique Mall|Antiques",i]`],
  },
  {
    id: "entertainment",
    label: "Entertainment",
    emoji: "🎭",
    group: "fun",
    osm: [`["amenity"~"^(theatre|cinema|casino|arts_centre)$"]`, `["leisure"~"^(bowling_alley|amusement_arcade)$"]`],
  },
  {
    id: "kids",
    label: "Kids",
    emoji: "🧒",
    group: "fun",
    osm: [`["leisure"~"^(playground|trampoline_park)$"]`, `["amenity"="childcare"]["name"~"Play",i]`],
  },
  {
    id: "lodging",
    label: "Hotels",
    emoji: "🏨",
    group: "stay",
    osm: [`["tourism"~"^(hotel|motel|resort)$"]`],
  },
  {
    id: "fuel",
    label: "Gas",
    emoji: "⛽",
    group: "roadside",
    osm: [`["amenity"="fuel"]`],
  },
  {
    id: "travel",
    label: "Travel Centers",
    emoji: "🛒⛽",
    group: "roadside",
    osm: [
      `["amenity"="fuel"]["brand"~"Buc-ee|Wawa|Sheetz|Pilot|Flying J|Love's|Kwik Trip|Casey's|QuikTrip|Royal Farms|RaceTrac|Maverik|TA Travel|Petro|Kum & Go|Cumberland Farms|Stewart's|Turkey Hill|GetGo|Rutter's|Speedway|7-Eleven|Circle K|Thorntons|Holiday|Kwik Star|Road Ranger|Iron Skillet|Sapp Bros|Bosselman",i]`,
      `["amenity"="fuel"]["shop"~"convenience|food|deli"]`,
      `["highway"="services"]`,
    ],
  },
  {
    id: "ev",
    label: "EV Charging",
    emoji: "🔌",
    group: "roadside",
    osm: [`["amenity"="charging_station"]`],
  },
  {
    id: "rest",
    label: "Rest Areas",
    emoji: "🅿️",
    group: "roadside",
    osm: [`["highway"~"^(rest_area|services)$"]`],
  },
  {
    id: "restrooms",
    label: "Restrooms",
    emoji: "🚻",
    group: "roadside",
    osm: [`["amenity"="toilets"]`],
    walkable: true,
  },
  {
    id: "campgrounds",
    label: "Campgrounds",
    emoji: "🏕️",
    group: "stay",
    osm: [`["tourism"~"^(camp_site|caravan_site)$"]`],
  },
  {
    id: "groceries",
    label: "Groceries & Pharmacy",
    emoji: "🛒",
    group: "roadside",
    osm: [`["shop"~"^(supermarket|convenience)$"]`, `["amenity"="pharmacy"]`],
    walkable: true,
  },
  {
    id: "wine",
    label: "Wine, Beer & Spirits",
    emoji: "🍷",
    group: "food",
    hint: "Wineries, tasting rooms, breweries, distilleries, cideries",
    osm: [`["craft"~"^(winery|brewery|distillery|cidery)$"]`, `["tourism"="wine_cellar"]`, `["amenity"="biergarten"]`, `["shop"="wine"]["name"~"Tasting|Vineyard|Winery",i]`],
    walkable: true,
  },
  {
    id: "flea",
    label: "Flea Markets & Swap Meets",
    emoji: "🧺",
    group: "shopping",
    osm: [`["amenity"="marketplace"]`, `["shop"]["name"~"Flea Market|Swap Meet|Trade Days|Trading Post|Peddlers|Bazaar",i]`, `["landuse"="retail"]["name"~"Flea Market|Swap Meet",i]`],
  },
  {
    id: "fairgrounds",
    label: "Fairgrounds & Expo Centers",
    emoji: "🎪",
    group: "fun",
    hint: "County and state fairs, car shows, swap meets and festivals happen here",
    osm: [`["name"~"Fairground|County Fair|State Fair|Expo Center|Exposition|Showground",i]`, `["amenity"~"^(events_venue|exhibition_centre|festival_grounds)$"]`],
  },
  {
    id: "amusement",
    label: "Amusement & Water Parks",
    emoji: "🎢",
    group: "fun",
    osm: [`["tourism"="theme_park"]`, `["leisure"="water_park"]`],
  },
  {
    id: "gokarts",
    label: "Go-Karts & Zip Lines",
    emoji: "🏎️",
    group: "fun",
    osm: [`["leisure"="track"]["sport"~"karting|go_kart",i]`, `["attraction"~"zip_line|summer_toboggan|alpine_slide"]`, `["aerialway"="zip_line"]`, `["leisure"="adventure_park"]`, `["name"~"Go[- ]?Kart|Zip ?Line|Zipline|Adventure Park",i]["leisure"]`],
  },
  {
    id: "minigolf",
    label: "Mini Golf",
    emoji: "⛳",
    group: "fun",
    osm: [`["leisure"="miniature_golf"]`],
    walkable: true,
  },
  {
    id: "golf",
    label: "Golf Courses",
    emoji: "🏌️",
    group: "outdoors",
    osm: [`["leisure"~"^(golf_course|driving_range)$"]`],
  },
  {
    id: "caves",
    label: "Caves & Caverns",
    emoji: "🪨",
    group: "outdoors",
    osm: [`["natural"="cave_entrance"]`, `["tourism"="attraction"]["name"~"Cave|Cavern|Grotto",i]`],
  },
  {
    id: "hiking",
    label: "Hiking Trails",
    emoji: "🥾",
    group: "outdoors",
    hint: "Trailheads and named trails, with length and difficulty when mapped",
    osm: [`["highway"="trailhead"]`, `["information"="trailhead"]`, `["route"="hiking"]`, `["route"="foot"]["name"~"Trail",i]`],
  },
  {
    id: "biking",
    label: "Bike Paths & Trails",
    emoji: "🚴",
    group: "outdoors",
    osm: [`["route"~"^(bicycle|mtb)$"]`, `["highway"="cycleway"]["name"~"Trail|Path|Greenway|Rail Trail",i]`],
  },
  {
    id: "hotsprings",
    label: "Hot Springs",
    emoji: "♨️",
    group: "outdoors",
    osm: [`["natural"="hot_spring"]`, `["amenity"="public_bath"]["bath:type"~"hot_spring|thermal"]`, `["leisure"="resort"]["name"~"Hot Springs",i]`],
  },
  {
    id: "boating",
    label: "Boat Launches & Marinas",
    emoji: "⛵",
    group: "outdoors",
    osm: [`["leisure"="slipway"]`, `["leisure"="marina"]`, `["amenity"="boat_rental"]`, `["waterway"="boat_ramp"]`],
  },
  {
    id: "offroad",
    label: "Off-Road, ATV & Snowmobile",
    emoji: "🏍️",
    group: "outdoors",
    hint: "OHV parks and marked ATV / snowmobile trail systems",
    osm: [`["route"~"^(atv|snowmobile|off_road|ohv)$"]`, `["leisure"="track"]["sport"~"motocross|atv|off_road|enduro",i]`, `["name"~"OHV|Off[- ]Road|ORV|ATV Park|Snowmobile",i]["leisure"]`],
  },
  {
    id: "bnb",
    label: "Bed & Breakfasts",
    emoji: "🛏️",
    group: "stay",
    osm: [`["tourism"~"^(guest_house|bed_and_breakfast)$"]`, `["tourism"="hotel"]["name"~"Bed (and|&) Breakfast|B&B|Inn\\b",i]`],
  },
  {
    id: "camping_free",
    label: "Free & Dispersed Camping (BLM, USFS)",
    emoji: "🌌",
    group: "stay",
    hint: "No-fee sites, dispersed camping and public-land camping",
    osm: [`["tourism"~"^(camp_site|caravan_site)$"]["fee"="no"]`, `["tourism"="camp_site"]["backcountry"="yes"]`, `["tourism"~"^(camp_site|caravan_site)$"]["operator"~"Bureau of Land Management|BLM|Forest Service|USFS|Army Corps",i]`, `["boundary"="protected_area"]["operator"~"Bureau of Land Management",i]`],
  },
  {
    id: "spa",
    label: "Day Spas & Wellness",
    emoji: "💆",
    group: "stay",
    osm: [`["leisure"~"^(spa|sauna)$"]`, `["amenity"="spa"]`, `["shop"~"^(massage|beauty)$"]["name"~"Spa|Wellness",i]`, `["amenity"="public_bath"]`],
    walkable: true,
  },
];

export const CATEGORY_GROUPS: Array<{ id: CategoryGroupId; label: string; emoji: string }> = [
  { id: "food", label: "Food & Drink", emoji: "🍽️" },
  { id: "fun", label: "Fun & Attractions", emoji: "🎡" },
  { id: "outdoors", label: "Outdoors & Adventure", emoji: "🌲" },
  { id: "shopping", label: "Shopping", emoji: "🛍️" },
  { id: "stay", label: "Stay & Relax", emoji: "🏨" },
  { id: "roadside", label: "Roadside Essentials", emoji: "⛽" },
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

/** Every category id, A→Z by label, for checklists. */
export const CATEGORIES_AZ: Category[] = [...CATEGORIES].sort((a, b) => a.label.localeCompare(b.label));
export const ALL_CATEGORY_IDS: CategoryId[] = CATEGORIES.map((c) => c.id);

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
const TRAVEL_BRAND_RE = /buc-?ee|wawa|sheetz|pilot|flying j|love's|loves travel|kwik trip|casey's|quiktrip|royal farms|racetrac|maverik|\bta\b|petro|kum & go|cumberland farms|stewart's|turkey hill|getgo|rutter's|speedway|7-eleven|circle k|thorntons|kwik star|road ranger|iron skillet|sapp bros|bosselman/i;
const BUFFET_RE = /buffet|smorgasbord|all[- ]you[- ]can[- ]eat|golden corral|hometown|cicis|sizzler|pizza ranch/i;
const SOUVENIR_RE = /souvenir|gift|trading post|general store/i;

export function categorize(tags: Record<string, string>): CategoryId | null {
  const t = tags;
  if (t.amenity === "charging_station") return "ev";
  if (t.highway === "services") return "travel";
  if (t.amenity === "fuel") {
    if (TRAVEL_BRAND_RE.test(`${t.brand ?? ""} ${t.name ?? ""}`) || ["convenience", "food", "deli"].includes(t.shop ?? "")) return "travel";
    return "fuel";
  }
  if (t.amenity === "restaurant" && (BUFFET_RE.test(t.cuisine ?? "") || BUFFET_RE.test(t.name ?? ""))) return "buffets";
  if (["winery", "brewery", "distillery", "cidery"].includes(t.craft ?? "") || t.tourism === "wine_cellar" || t.amenity === "biergarten" || (t.shop === "wine" && /tasting|vineyard|winery/i.test(t.name ?? ""))) return "wine";
  if (t.natural === "hot_spring" || (t.amenity === "public_bath" && /hot_spring|thermal/.test(t["bath:type"] ?? "")) || /hot springs/i.test(t.name ?? "") && t.leisure) return "hotsprings";
  if (t.natural === "cave_entrance" || (t.tourism === "attraction" && /cave|cavern|grotto/i.test(t.name ?? ""))) return "caves";
  if (["slipway", "marina"].includes(t.leisure ?? "") || t.amenity === "boat_rental" || t.waterway === "boat_ramp") return "boating";
  if (["golf_course", "driving_range"].includes(t.leisure ?? "")) return "golf";
  if (t.leisure === "miniature_golf") return "minigolf";
  if (t.tourism === "theme_park" || t.leisure === "water_park") return "amusement";
  if ((t.leisure === "track" && /karting|go_kart/i.test(t.sport ?? "")) || /zip_line|summer_toboggan|alpine_slide/.test(t.attraction ?? "") || t.aerialway === "zip_line" || t.leisure === "adventure_park" || (t.leisure && /go[- ]?kart|zip ?line|adventure park/i.test(t.name ?? ""))) return "gokarts";
  if (["atv", "snowmobile", "off_road", "ohv"].includes(t.route ?? "") || (t.leisure === "track" && /motocross|atv|off_road|enduro/i.test(t.sport ?? "")) || (t.leisure && /\bOHV\b|off[- ]road|\bORV\b|ATV Park|snowmobile/i.test(t.name ?? ""))) return "offroad";
  if (t.highway === "trailhead" || t.information === "trailhead" || t.route === "hiking" || (t.route === "foot" && /trail/i.test(t.name ?? ""))) return "hiking";
  if (["bicycle", "mtb"].includes(t.route ?? "") || (t.highway === "cycleway" && /trail|path|greenway|rail trail/i.test(t.name ?? ""))) return "biking";
  if (["spa", "sauna"].includes(t.leisure ?? "") || t.amenity === "spa" || t.amenity === "public_bath" || (["massage", "beauty"].includes(t.shop ?? "") && /spa|wellness/i.test(t.name ?? ""))) return "spa";
  if (["guest_house", "bed_and_breakfast"].includes(t.tourism ?? "") || (t.tourism === "hotel" && /bed (and|&) breakfast|b&b|\binn\b/i.test(t.name ?? ""))) return "bnb";
  if (["camp_site", "caravan_site"].includes(t.tourism ?? "") && (t.fee === "no" || t.backcountry === "yes" || /bureau of land management|\bblm\b|forest service|usfs|army corps/i.test(t.operator ?? ""))) return "camping_free";
  if (t.boundary === "protected_area" && /bureau of land management/i.test(t.operator ?? "")) return "camping_free";
  if (t.amenity === "marketplace" || ((t.shop || t.landuse === "retail") && /flea market|swap meet|trade days|trading post|peddlers|bazaar/i.test(t.name ?? ""))) return "flea";
  if (/fairground|county fair|state fair|expo center|exposition|showground/i.test(t.name ?? "") || ["events_venue", "exhibition_centre", "festival_grounds"].includes(t.amenity ?? "")) return "fairgrounds";
  if (t.amenity === "toilets") return "restrooms";
  if (t.highway === "rest_area" || t.highway === "services") return "rest";
  if (["hotel", "motel", "resort"].includes(t.tourism ?? "")) return "lodging";
  if (["camp_site", "caravan_site"].includes(t.tourism ?? "")) return "campgrounds";
  if (t.amenity === "cafe" || t.shop === "coffee") return "coffee";
  if (["restaurant", "fast_food", "food_court", "ice_cream"].includes(t.amenity ?? "") || t.shop === "bakery")
    return "food";
  if (["antiques", "second_hand", "charity", "auction"].includes(t.shop ?? "")) return "antiques";
  if (["playground", "trampoline_park"].includes(t.leisure ?? "")) return "kids";
  if (["theatre", "cinema", "casino", "arts_centre"].includes(t.amenity ?? "") || ["bowling_alley", "amusement_arcade"].includes(t.leisure ?? ""))
    return "entertainment";
  if (["gift", "souvenir", "craft"].includes(t.shop ?? "") || (t.shop && SOUVENIR_RE.test(t.name ?? ""))) return "souvenirs";
  if (["supermarket", "convenience"].includes(t.shop ?? "") || t.amenity === "pharmacy") return "groceries";
  if (["chocolate", "candy", "confectionery", "cheese", "deli", "wine", "tea", "spices", "toys", "games", "hobby", "music", "art", "boutique", "pottery", "leather", "honey", "nuts"].includes(t.shop ?? ""))
    return "specialty";
  if (["mall", "department_store", "outlet", "books", "clothes", "farm"].includes(t.shop ?? ""))
    return "shopping";
  if (["monument", "memorial", "statue", "wayside_cross", "boundary_stone"].includes(t.historic ?? "") || ["lighthouse", "obelisk"].includes(t.man_made ?? "") || (t.man_made === "tower" && t.tourism === "attraction"))
    return "landmarks";
  if (["building", "castle", "manor", "fort", "house", "mansion", "courthouse", "mill", "farm", "church", "city_gate", "tower", "hotel", "railway_station"].includes(t.historic ?? "") || (t.heritage && t.building))
    return "historic_buildings";
  if (t.historic) return "historic";
  if (["park", "nature_reserve", "garden"].includes(t.leisure ?? "") || t.boundary === "national_park" || ["beach", "waterfall", "peak"].includes(t.natural ?? ""))
    return "outdoors";
  if (["attraction", "museum", "zoo", "theme_park", "aquarium", "viewpoint", "gallery", "artwork"].includes(t.tourism ?? ""))
    return "attractions";
  return null;
}
