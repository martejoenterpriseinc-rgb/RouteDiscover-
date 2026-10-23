"use client";

import { useMemo } from "react";
import { Map } from "./Map";
import { placeMarker } from "@/lib/markers";
import type { TripStop } from "@/db/schema";
import type { LatLng } from "@/lib/types";

export function TripMap({ route, stops, selectedId, onSelect }: { route: LatLng[] | null; stops: TripStop[]; selectedId?: string | null; onSelect?: (id: string) => void }) {
  const markers = useMemo(() => stops.map(placeMarker), [stops]);
  return <Map route={route ?? undefined} markers={markers} selectedId={selectedId} onSelect={onSelect} fitKey={`${route?.length ?? 0}-${stops.length}`} />;
}
