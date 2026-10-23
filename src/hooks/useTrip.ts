"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Preferences } from "@/db/schema";
import { simplifyTo } from "@/lib/geo";
import type { GeoResult, RouteResult } from "@/lib/types";

export type Trip = {
  origin?: GeoResult;
  destination?: GeoResult;
  radiusMiles: number;
  radiusTouched?: boolean;
  route?: RouteResult;
  /** Saved trip currently being planned (stops get added to it). */
  activeTrip?: { id: string; name: string; startDate?: string; endDate?: string };
  /** Signed-in user's preferences, seeded by the app layout. */
  preferences?: Preferences;
};

const KEY = "routediscover:trip:v1";
const DEFAULT_TRIP: Trip = { radiusMiles: 10 };

let state: Trip | null = null;
const listeners = new Set<() => void>();

function load(): Trip {
  if (state) return state;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    state = raw ? { ...DEFAULT_TRIP, ...(JSON.parse(raw) as Trip) } : DEFAULT_TRIP;
  } catch {
    state = DEFAULT_TRIP;
  }
  return state;
}

function save(next: Trip) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage may be unavailable; keep in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useTrip() {
  const trip = useSyncExternalStore(subscribe, load, () => DEFAULT_TRIP);
  const update = useCallback((patch: Partial<Trip>) => {
    const cur = load();
    const next = { ...cur, ...patch };
    if (next.route && next.route.geometry.length > 600) {
      next.route = { ...next.route, geometry: simplifyTo(next.route.geometry, 600) };
    }
    save(next);
  }, []);
  const clearRoute = useCallback(() => save({ ...load(), route: undefined }), []);
  return { trip, update, clearRoute };
}
