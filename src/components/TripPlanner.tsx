"use client";

import { useState } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useTrip } from "@/hooks/useTrip";
import { fetchRoute } from "@/lib/client";
import { fmtDuration, fmtMiles } from "@/lib/geo";
import type { GeoResult } from "@/lib/types";
import { PlaceInput } from "./PlaceInput";
import { Button, ErrorNote, RadiusSlider } from "./ui";

/**
 * Origin / destination / corridor width. Shared by every screen that works
 * "along my route"; the planned route is stored in the trip store.
 */
export function TripPlanner({ compact = false, onPlanned }: { compact?: boolean; onPlanned?: () => void }) {
  const { trip, update, clearRoute } = useTrip();
  const geo = useGeolocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!trip.route);

  async function locate(): Promise<GeoResult | null> {
    const p = await geo.locate();
    return p ? { label: "My location", lat: p.lat, lng: p.lng } : null;
  }

  async function plan() {
    if (!trip.origin || !trip.destination) {
      setError("Enter both a starting point and a destination.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetchRoute(trip.origin, trip.destination);
      update({ route: { ...r.data, source: r.source } });
      setOpen(false);
      onPlanned?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not plan the route.");
    } finally {
      setBusy(false);
    }
  }

  if (compact && trip.route && !open) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3">
        <div className="min-w-0 text-sm">
          <div className="truncate font-semibold">
            {trip.route.origin.label} → {trip.route.destination.label}
          </div>
          <div className="text-xs text-muted">
            {fmtMiles(trip.route.distanceMiles)} · {fmtDuration(trip.route.durationMinutes)} · corridor ±{trip.radiusMiles} mi
          </div>
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Edit
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3"
      onSubmit={(e) => {
        e.preventDefault();
        plan();
      }}
    >
      <PlaceInput
        label="From"
        placeholder="City, address, or use my location"
        value={trip.origin}
        onChange={(v) => update({ origin: v, route: undefined })}
        onLocate={locate}
        locating={geo.loading}
      />
      <PlaceInput
        label="To"
        placeholder="Where are you headed?"
        value={trip.destination}
        onChange={(v) => update({ destination: v, route: undefined })}
      />
      <RadiusSlider
        label="Miles off route"
        value={trip.radiusMiles}
        min={1}
        max={50}
        onChange={(v) => update({ radiusMiles: v })}
      />
      {geo.error && <ErrorNote>{geo.error}</ErrorNote>}
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? "Planning…" : trip.route ? "Update route" : "Plan my route"}
        </Button>
        {trip.route && (
          <Button type="button" variant="secondary" onClick={() => { clearRoute(); setOpen(true); }}>
            Clear
          </Button>
        )}
      </div>
      {trip.route && (
        <p className="text-xs text-muted">
          {fmtMiles(trip.route.distanceMiles)} · about {fmtDuration(trip.route.durationMinutes)} of driving
        </p>
      )}
    </form>
  );
}
