import { CATEGORY_BY_ID } from "./categories";
import type { CategoryId, Charger, Hotel, Place } from "./types";
import type { MapMarker } from "@/components/MapView";

export const CATEGORY_COLORS: Record<CategoryId, string> = {
  food: "#f15a29",
  coffee: "#8d5524",
  attractions: "#1f8ae6",
  outdoors: "#4caf50",
  historic: "#8e44ad",
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

export const chargerMarker = (c: Charger): MapMarker => ({
  id: c.id,
  lat: c.lat,
  lng: c.lng,
  label: c.name,
  emoji: "⚡",
  color: "#e82127",
  sub: [c.stalls ? `${c.stalls} stalls` : null, c.maxKw ? `${Math.round(c.maxKw)} kW` : null].filter(Boolean).join(" · "),
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
