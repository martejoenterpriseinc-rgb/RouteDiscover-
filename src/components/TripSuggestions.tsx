"use client";

import { useEffect, useMemo, useState } from "react";
import { PlaceCard } from "./Cards";
import { Disclosure } from "./Disclosure";
import { CategoryChips, Empty } from "./ui";
import { useTrip } from "@/hooks/useTrip";
import { CATEGORY_BY_ID } from "@/lib/categories";
import { fetchPlaces } from "@/lib/client";
import { fmtDateShort, tripDays } from "@/lib/dates";
import { addStop, type TripRecord } from "@/lib/trips-client";
import type { CategoryId, Place } from "@/lib/types";

/** "Here's what you said you like, along this drive" with one-tap add to the drive or a day. */
export function TripSuggestions({ trip, onAdded }: { trip: TripRecord; onAdded: (t: TripRecord) => void }) {
  const { trip: store } = useTrip();
  const [cats, setCats] = useState<CategoryId[] | null>(null);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const categories = cats ?? store.preferences?.categories ?? ["attractions", "food", "outdoors", "historic"];
  const key = trip.routeGeometry && categories.length ? `${trip.id}|${trip.radiusMiles}|${categories.join(",")}` : "";
  useEffect(() => {
    if (!key || !trip.routeGeometry) return;
    let cancelled = false;
    fetchPlaces({ route: trip.routeGeometry, radiusMiles: trip.radiusMiles }, categories)
      .then((r) => { if (!cancelled) setPlaces(r.data); })
      .catch(() => { if (!cancelled) setPlaces([]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const days = useMemo(() => tripDays(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);
  const have = new Set(trip.stops.map((s) => s.id));
  const picks = (places ?? []).filter((p) => !have.has(p.id)).slice(0, 10);
  async function add(p: Place, day?: string) {
    setBusy(p.id);
    try {
      const r = await addStop(trip.id, p, undefined, day);
      onAdded(r.trip);
    } finally {
      setBusy(null);
    }
  }
  if (!trip.routeGeometry) return null;
  return (
    <Disclosure id="trip-suggestions" title="Suggested for you along the way" size="lg" summary={`${categories.map((c) => CATEGORY_BY_ID[c]?.label).filter(Boolean).slice(0, 4).join(", ")}${categories.length > 4 ? "…" : ""}`} className="rounded-2xl border border-border bg-surface p-4 shadow-sm" bodyClassName="mt-3 flex flex-col gap-3">
      <p className="text-xs text-muted">Based on the categories in your preferences, within {trip.radiusMiles} mi of the drive. Change them below for this list only.</p>
      <CategoryChips value={categories} onChange={setCats} />
      {places === null ? (
        <p className="text-sm text-muted">Looking along the route…</p>
      ) : picks.length === 0 ? (
        <Empty>Nothing new to suggest for those categories. Everything found is already in the trip.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {picks.map((p) => (
            <PlaceCard
              key={p.id}
              place={p}
              action={
                <select
                  aria-label="Add to trip"
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs font-semibold"
                  value=""
                  disabled={busy === p.id}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { if (e.target.value) void add(p, e.target.value === "route" ? undefined : e.target.value); }}
                >
                  <option value="">{busy === p.id ? "Adding…" : "+ Add…"}</option>
                  <option value="route">As a stop on the drive</option>
                  {days.map((d, i) => (
                    <option key={d} value={d}>Day {i + 1} · {fmtDateShort(d)}</option>
                  ))}
                </select>
              }
            />
          ))}
        </ul>
      )}
    </Disclosure>
  );
}
