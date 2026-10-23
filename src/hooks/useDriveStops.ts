"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useTrip } from "@/hooks/useTrip";
import { fetchRoute } from "@/lib/client";
import type { GeoResult, Place } from "@/lib/types";

type Status = { busy: boolean; error: string | null };
let status: Status = { busy: false, error: null };
const listeners = new Set<() => void>();
const setStatus = (s: Status) => {
  status = s;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getStatus = () => status;
const NO_STOPS: Place[] = [];

export const asGeo = (p: Place): GeoResult => ({ label: p.name, lat: p.lat, lng: p.lng });

/**
 * Stops the traveller ticks on result cards. Each change re-plans the drive through
 * the stops in mile order, so the map and the mileage reflect the real detours.
 */
export function useDriveStops() {
  const { trip, update } = useTrip();
  const { busy, error } = useSyncExternalStore(subscribe, getStatus, getStatus);
  const stops = trip.stops ?? NO_STOPS;
  const route = trip.route;

  const replan = useCallback(
    async (next: Place[]) => {
      const ordered = [...next].sort((a, b) => (a.alongMiles ?? Infinity) - (b.alongMiles ?? Infinity));
      update({ stops: ordered });
      if (!route) return;
      setStatus({ busy: true, error: null });
      try {
        const r = await fetchRoute(route.origin, route.destination, ordered.map(asGeo));
        update({ route: { ...r.data, source: r.source } });
        setStatus({ busy: false, error: null });
      } catch (e) {
        setStatus({ busy: false, error: e instanceof Error ? e.message : "Could not re-plan the drive." });
      }
    },
    [route, update],
  );

  const has = useCallback((id: string) => stops.some((s) => s.id === id), [stops]);
  const toggle = useCallback((p: Place) => replan(has(p.id) ? stops.filter((s) => s.id !== p.id) : [...stops, p]), [has, replan, stops]);
  const remove = useCallback((id: string) => replan(stops.filter((s) => s.id !== id)), [replan, stops]);
  const clear = useCallback(() => replan([]), [replan]);

  return { stops, has, toggle, remove, clear, busy, error, canRoute: !!route };
}
