"use client";

import type { Trip } from "@/db/schema";
import type { GeoResult, LatLng, Place } from "./types";

/** Trip as it arrives over JSON (timestamps are strings). */
export type TripRecord = Omit<Trip, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string };

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
  return j;
}

export const listTrips = () => call<{ trips: TripRecord[] }>("/api/trips").then((r) => r.trips);
export const getTrip = (id: string) => call<{ trip: TripRecord }>(`/api/trips/${id}`).then((r) => r.trip);
export const createTrip = (input: {
  name: string;
  origin: GeoResult;
  destination: GeoResult;
  startDate: string;
  endDate: string;
  radiusMiles: number;
  notes?: string;
  route?: { geometry: LatLng[]; distanceMiles: number; durationMinutes: number } | null;
}) => call<{ trip: TripRecord }>("/api/trips", { method: "POST", body: JSON.stringify(input) }).then((r) => r.trip);
export const updateTrip = (id: string, patch: Record<string, unknown>) =>
  call<{ trip: TripRecord }>(`/api/trips/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).then((r) => r.trip);
export const deleteTrip = (id: string) => call<{ ok: true }>(`/api/trips/${id}`, { method: "DELETE" });
export const addStop = (id: string, place: Place, note?: string) =>
  call<{ trip: TripRecord; added: boolean }>(`/api/trips/${id}/stops`, { method: "POST", body: JSON.stringify({ place, note }) });
export const removeStop = (id: string, placeId: string) =>
  call<{ trip: TripRecord }>(`/api/trips/${id}/stops`, { method: "DELETE", body: JSON.stringify({ placeId }) }).then((r) => r.trip);
export const shareTrip = (id: string, action: "enable" | "disable" | "rotate", channel?: string) =>
  call<{ isPublic: boolean; url: string }>(`/api/trips/${id}/share`, { method: "POST", body: JSON.stringify({ action, channel }) });

export { fmtDate, fmtDateShort, todayIso } from "./dates";
import { todayIso as _today } from "./dates";
export const isHistory = (t: TripRecord) => t.status === "completed" || t.status === "canceled" || t.endDate < _today();
