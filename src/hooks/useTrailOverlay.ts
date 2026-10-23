"use client";

import { useEffect, useState } from "react";
import type { LatLng, Place } from "@/lib/types";

/** When a hiking or biking trail from OpenStreetMap is selected, fetch its geometry to draw on the map. */
export function useTrailOverlay(place: Place | null | undefined): LatLng[][] {
  const id = place && (place.category === "hiking" || place.category === "biking") && /^osm-(relation|way)-/.test(place.id) ? place.id : null;
  const [state, setState] = useState<{ id: string | null; lines: LatLng[][] }>({ id: null, lines: [] });
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/trails/${id}`)
      .then((r) => r.json())
      .then((j: { lines?: LatLng[][] }) => {
        if (!cancelled) setState({ id, lines: j.lines ?? [] });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);
  return state.id === id && id ? state.lines : [];
}
