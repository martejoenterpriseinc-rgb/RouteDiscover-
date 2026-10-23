import { CATEGORY_BY_ID } from "./categories";
import { EVENT_KIND_BY_ID, fmtEventWhen } from "./event-kinds";
import { networkById, pricingSummary } from "./ev-networks";
import type { CategoryId, Charger, Happening, Hotel, Place } from "./types";
import type { MapMarker } from "@/components/MapView";

export const CATEGORY_COLORS: Record<CategoryId, string> = {
  food: "#f15a29",
  coffee: "#8d5524",
  attractions: "#1f8ae6",
  outdoors: "#4caf50",
  historic: "#8e44ad",
  landmarks: "#283593",
  historic_buildings: "#6d4c41",
  shopping: "#e91e63",
  antiques: "#a0522d",
  entertainment: "#ff6f00",
  kids: "#00acc1",
  lodging: "#1c2b5a",
  fuel: "#546e7a",
  ev: "#2e7d32",
  rest: "#607d8b",
  restrooms: "#78909c",
  groceries: "#7cb342",
  campgrounds: "#2e7d32",
  travel: "#b71c1c",
  souvenirs: "#d81b60",
  specialty: "#6d4c41",
  buffets: "#ef6c00",
  wine: "#7b1fa2",
  flea: "#8d6e63",
  fairgrounds: "#c2185b",
  amusement: "#f50057",
  gokarts: "#ff3d00",
  minigolf: "#43a047",
  golf: "#2e7d32",
  caves: "#5d4037",
  hiking: "#33691e",
  biking: "#0288d1",
  hotsprings: "#d84315",
  boating: "#0277bd",
  offroad: "#795548",
  bnb: "#6a1b9a",
  camping_free: "#1b5e20",
  spa: "#ad1457",
};

export const placeMarker = (p: Place): MapMarker => ({
  id: p.id,
  lat: p.lat,
  lng: p.lng,
  label: p.name,
  emoji: CATEGORY_BY_ID[p.category].emoji,
  color: CATEGORY_COLORS[p.category],
  sub: p.address,
});

/** A stop the traveller added to the drive. */
export const stopMarker = (p: Place, n: number): MapMarker => ({
  id: `stop-${p.id}`,
  lat: p.lat,
  lng: p.lng,
  label: `Stop ${n}: ${p.name}`,
  emoji: String(n),
  color: "#1c2b5a",
  sub: p.address,
});

export const eventMarker = (h: Happening): MapMarker => ({
  id: h.id,
  lat: h.lat,
  lng: h.lng,
  label: h.title,
  emoji: EVENT_KIND_BY_ID[h.kind]?.emoji ?? "📅",
  color: "#c2185b",
  sub: [fmtEventWhen(h), h.venue].filter(Boolean).join(" · "),
});

export const chargerMarker = (c: Charger): MapMarker => ({
  id: c.id,
  lat: c.lat,
  lng: c.lng,
  label: c.name,
  emoji: "⚡",
  color: networkById(c.network).color,
  sub: [c.networkLabel, c.stalls ? `${c.stalls} stalls` : null, c.maxKw ? `${Math.round(c.maxKw)} kW` : null, pricingSummary(c.pricing, c.costTier)].filter(Boolean).join(" · "),
});

export const hotelMarker = (h: Hotel): MapMarker => ({
  id: h.id,
  lat: h.lat,
  lng: h.lng,
  label: h.name,
  emoji: "🏨",
  color: !h.hasCharger ? "#90a4ae" : h.chargerTier === "free" ? "#4caf50" : h.chargerTier === "paid" ? "#f7941d" : "#1c2b5a",
  sub: h.hasCharger ? `${h.chargerTier === "free" ? "Free" : h.chargerTier === "paid" ? "Paid" : ""} EV charging${h.teslaDestination ? " · Tesla Destination" : ""}` : "No charger listed",
});
