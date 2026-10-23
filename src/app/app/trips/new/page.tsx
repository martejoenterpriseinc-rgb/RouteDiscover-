"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PlaceInput } from "@/components/PlaceInput";
import { Button, ErrorNote, RadiusSlider } from "@/components/ui";
import { useTrip } from "@/hooks/useTrip";
import { fmtDuration, fmtMiles } from "@/lib/geo";
import { createTrip, todayIso } from "@/lib/trips-client";
import type { GeoResult } from "@/lib/types";

const field = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none ring-blue/40 focus:ring-2";

function NewTripInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { trip, update } = useTrip();
  const date = params.get("date") || todayIso();
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState<GeoResult | undefined>(trip.origin);
  const [destination, setDestination] = useState<GeoResult | undefined>(trip.destination);
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [radius, setRadius] = useState(trip.radiusMiles);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reuseRoute = trip.route && trip.origin?.label === origin?.label && trip.destination?.label === destination?.label;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !destination) return setError("Pick a starting point and a destination.");
    setBusy(true);
    setError(null);
    try {
      const created = await createTrip({
        name: name.trim() || `${origin.label} → ${destination.label}`,
        origin,
        destination,
        startDate,
        endDate: endDate < startDate ? startDate : endDate,
        radiusMiles: radius,
        notes,
        route: reuseRoute ? trip.route : null,
      });
      update({ activeTrip: { id: created.id, name: created.name } });
      router.push(`/app/trips/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the trip.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl p-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Plan a trip</h1>
      <p className="mt-1 text-sm text-muted">Save the route and dates; add stops from any search afterwards.</p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Trip name</span>
          <input className={field} placeholder="Lancaster long weekend" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <PlaceInput label="From" placeholder="City or address" value={origin} onChange={setOrigin} />
        <PlaceInput label="To" placeholder="Where are you headed?" value={destination} onChange={setDestination} />
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Leaving</span>
            <input type="date" className={field} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Returning</span>
            <input type="date" className={field} value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} required />
          </label>
        </div>
        <RadiusSlider label="Miles off route" value={radius} min={1} max={50} onChange={setRadius} />
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Notes</span>
          <textarea className={field} rows={3} placeholder="Who's coming, must-see stops, hotel ideas…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {reuseRoute && trip.route && (
          <p className="rounded-lg bg-cream px-3 py-2 text-xs">
            Using the route you already planned: {fmtMiles(trip.route.distanceMiles)}, about {fmtDuration(trip.route.durationMinutes)}.
          </p>
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save trip"}
        </Button>
      </form>
    </div>
  );
}

export default function NewTripPage() {
  return (
    <Suspense>
      <NewTripInner />
    </Suspense>
  );
}
