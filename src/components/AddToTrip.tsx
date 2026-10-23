"use client";

import Link from "next/link";
import { useState } from "react";
import { useTrip } from "@/hooks/useTrip";
import { fmtDateShort, tripDays } from "@/lib/dates";
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
  const [where, setWhere] = useState<string>("");
  if (!trip.activeTrip) return null;
  const id = trip.activeTrip.id;
  const days = trip.activeTrip.startDate && trip.activeTrip.endDate ? tripDays(trip.activeTrip.startDate, trip.activeTrip.endDate) : [];
  async function add(day?: string) {
    setState("busy");
    try {
      const r = await addStop(id, place, undefined, day);
      setState(r.added ? "added" : "dup");
    } catch {
      setState("idle");
    }
  }
  const label = state === "added" ? (where ? `✓ Added to ${fmtDateShort(where)}` : "✓ Added to trip") : state === "dup" ? "Already in trip" : state === "busy" ? "Adding…" : "+ Add to trip";
  if (days.length === 0 || state !== "idle") {
    return (
      <Button variant={state === "added" ? "primary" : "secondary"} className="px-3 py-1 text-xs" disabled={state !== "idle"} onClick={(e) => { e.stopPropagation(); void add(); }}>
        {label}
      </Button>
    );
  }
  return (
    <select
      aria-label="Add to trip"
      className="rounded-lg border border-border bg-surface px-2 py-1 text-xs font-semibold text-foreground hover:bg-cream"
      value=""
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return;
        setWhere(v === "route" ? "" : v);
        void add(v === "route" ? undefined : v);
      }}
    >
      <option value="">+ Add to trip…</option>
      <option value="route">As a stop on the drive</option>
      {days.map((d, i) => (
        <option key={d} value={d}>Day {i + 1} · {fmtDateShort(d)}</option>
      ))}
    </select>
  );
}

export const chargerAsPlace = (c: Charger): Place => ({ id: c.id, name: c.name, category: "ev", lat: c.lat, lng: c.lng, address: c.address, alongMiles: c.alongMiles, detourMiles: c.detourMiles, distanceMiles: c.distanceMiles });
export const hotelAsPlace = (h: Hotel): Place => ({ id: h.id, name: h.name, category: h.kind === "campground" ? "campgrounds" : "lodging", lat: h.lat, lng: h.lng, address: h.address, website: h.website, phone: h.phone, alongMiles: h.alongMiles, detourMiles: h.detourMiles, distanceMiles: h.distanceMiles });
