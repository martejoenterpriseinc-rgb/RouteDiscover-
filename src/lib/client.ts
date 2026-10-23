"use client";

import type { ApiEnvelope, CategoryId, Charger, GeoResult, Hotel, LatLng, Place, RouteResult } from "./types";

export type Area = { route: LatLng[]; radiusMiles: number } | { center: LatLng; radiusMiles: number };

async function post<T>(url: string, body: unknown): Promise<ApiEnvelope<T>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Partial<ApiEnvelope<T>> & { error?: string };
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as ApiEnvelope<T>;
}

export async function geocodeClient(q: string): Promise<ApiEnvelope<GeoResult[]>> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
  const json = (await res.json().catch(() => ({}))) as Partial<ApiEnvelope<GeoResult[]>> & { error?: string };
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as ApiEnvelope<GeoResult[]>;
}

export const fetchRoute = (origin: GeoResult | string, destination: GeoResult | string) =>
  post<RouteResult>("/api/route", { origin, destination });

export const fetchPlaces = (area: Area, categories: CategoryId[]) =>
  post<Place[]>("/api/places", { ...area, categories });

export const fetchChargers = (area: Area) => post<Charger[]>("/api/chargers", area);

export const fetchHotels = (area: Area, kinds: Array<"hotel" | "campground"> = ["hotel"]) => post<Hotel[]>("/api/hotels", { ...area, kinds });

export function mapsLink(p: LatLng, name?: string) {
  const q = name ? `${p.lat},${p.lng}(${encodeURIComponent(name)})` : `${p.lat},${p.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

export function appleMapsLink(p: LatLng, name?: string) {
  return `https://maps.apple.com/?daddr=${p.lat},${p.lng}${name ? `&q=${encodeURIComponent(name)}` : ""}`;
}
