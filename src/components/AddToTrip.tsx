"use client";

import Link from "next/link";
import { useState } from "react";
import { useTrip } from "@/hooks/useTrip";
import { addStop } from "@/lib/trips-client";
import type { Charger, Hotel, Place } from "@/lib/types";
import { Button } from "./ui";

/** Banner shown on search screens while a saved trip is being planned. */
export function ActiveTripBanner() {
  const { trip, update } = useTrip();
  if (!trip.activeTrip) return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-blue/40 bg-blue/10 px-3 py-2 text-sm">
      <span className="min-w-0 truncate">
        Planning stops for <Link href={`/app/trips/${trip.activeTrip.id}`} className="font-semibold text-blue hover:underline">{trip.activeTrip.name}</Link>
      </span>
      <button type="button" className="shrink-0 text-xs font-semibold text-muted hover:text-foreground" onClick={() => update({ activeTrip: undefined })}>
        Done
      </button>
    </div>
  );
}

/** "+ Add to trip" button for any result card; hidden when no trip is being planned. */
export function AddToTripButton({ place }: { place: Place }) {
  const { trip } = useTrip();
  const [state, setState] = useState<"idle" | "busy" | "added" | "dup">("idle");
  if (!trip.activeTrip) return null;
  const id = trip.activeTrip.id;
  return (
    <Button
      variant={state === "added" ? "primary" : "secondary"}
      className="px-3 py-1 text-xs"
      disabled={state === "busy"}
      onClick={async (e) => {
        e.stopPropagation();
        setState("busy");
        try {
          const r = await addStop(id, place);
          setState(r.added ? "added" : "dup");
        } catch {
          setState("idle");
        }
      }}
    >
      {state === "added" ? "✓ Added to trip" : state === "dup" ? "Already in trip" : state === "busy" ? "Adding…" : "+ Add to trip"}
    </Button>
  );
}

export const chargerAsPlace = (c: Charger): Place => ({ id: c.id, name: c.name, category: "ev", lat: c.lat, lng: c.lng, address: c.address, alongMiles: c.alongMiles, detourMiles: c.detourMiles, distanceMiles: c.distanceMiles });
export const hotelAsPlace = (h: Hotel): Place => ({ id: h.id, name: h.name, category: h.kind === "campground" ? "campgrounds" : "lodging", lat: h.lat, lng: h.lng, address: h.address, website: h.website, phone: h.phone, alongMiles: h.alongMiles, detourMiles: h.detourMiles, distanceMiles: h.distanceMiles });
