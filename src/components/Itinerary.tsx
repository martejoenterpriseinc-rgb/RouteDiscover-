"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PlaceCard } from "./Cards";
import { Disclosure } from "./Disclosure";
import { Button, Empty } from "./ui";
import { fmtDateShort, tripDays } from "@/lib/dates";
import { fmtTime, type ItineraryView, planDay, stopsFor } from "@/lib/itinerary";
import type { TripRecord } from "@/lib/trips-client";

export function Itinerary({
  trip,
  view,
  onView,
  selected,
  onSelect,
  busy,
  onChangeStops,
  onRemove,
}: {
  trip: TripRecord;
  view: ItineraryView;
  onView: (v: ItineraryView) => void;
  selected: string | null;
  onSelect: (id: string) => void;
  busy: boolean;
  onChangeStops: (stops: Array<{ id: string; day?: string | null; time?: string | null }>) => void;
  onRemove: (id: string) => void;
}) {
  const days = useMemo(() => tripDays(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);
  const visible = stopsFor(trip, view);
  const counts = useMemo(() => {
    const c: Record<string, number> = { route: 0 };
    for (const s of trip.stops) c[s.day ?? "route"] = (c[s.day ?? "route"] ?? 0) + 1;
    return c;
  }, [trip.stops]);
  const dayIndex = view === "route" ? -1 : days.indexOf(view);

  const patch = (id: string, p: { day?: string | null; time?: string | null }) => onChangeStops(trip.stops.map((s) => (s.id === id ? { id: s.id, ...p } : { id: s.id })));

  return (
    <Disclosure id="trip-itinerary" title={<>Stops & itinerary <span className="text-sm font-normal text-muted">({trip.stops.length})</span></>} summary="Itinerary hidden" bodyClassName="mt-2 flex flex-col gap-3">
      <div className="hide-scrollbar flex gap-1 overflow-x-auto" role="tablist" aria-label="Itinerary">
        <button type="button" role="tab" aria-selected={view === "route"} onClick={() => onView("route")} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${view === "route" ? "bg-navy text-white" : "border border-border bg-surface text-muted hover:bg-cream"}`}>
          🛣️ The drive{counts.route ? ` · ${counts.route}` : ""}
        </button>
        {days.map((d, i) => (
          <button key={d} type="button" role="tab" aria-selected={view === d} onClick={() => onView(d)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${view === d ? "bg-navy text-white" : "border border-border bg-surface text-muted hover:bg-cream"}`}>
            Day {i + 1} · {fmtDateShort(d)}{counts[d] ? ` · ${counts[d]}` : ""}
          </button>
        ))}
      </div>

      {view === "route" ? (
        <p className="text-xs text-muted">Stops along the way, in mile order. Use “Find stops along this route” to add more.</p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>Day {dayIndex + 1} around {trip.destination.label}. Add places from <Link href="/app/destination" className="font-semibold text-blue hover:underline">Destination lookup</Link> and pick this day.</span>
          {visible.length > 1 && (
            <Button
              variant="secondary"
              className="px-3 py-1 text-xs"
              disabled={busy}
              onClick={() => {
                const planned = planDay(visible, trip.destination);
                onChangeStops(trip.stops.map((s) => ({ id: s.id, ...(planned.find((p) => p.id === s.id) ? { time: planned.find((p) => p.id === s.id)!.time } : {}) })));
              }}
            >
              🗺️ Plan my day (shortest order, 9 AM start)
            </Button>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <Empty>{view === "route" ? "No stops on the drive yet." : "Nothing planned for this day yet. Add places from Destination lookup, or move a stop here."}</Empty>
      ) : (
        <ol className="flex flex-col gap-2">
          {visible.map((s, i) => (
            <PlaceCard
              key={s.id}
              place={s}
              selected={selected === s.id}
              onClick={() => onSelect(s.id)}
              action={
                <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {view !== "route" && (
                    <>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-bold text-white" aria-label={`Stop ${i + 1}`}>{i + 1}</span>
                      {s.time && <span className="text-xs font-semibold text-muted">{fmtTime(s.time)}</span>}
                      <input type="time" aria-label="Time" className="rounded border border-border bg-surface px-1.5 py-0.5 text-xs" value={s.time ?? ""} disabled={busy} onChange={(e) => patch(s.id, { time: e.target.value || null })} />
                    </>
                  )}
                  <select aria-label="Move to" className="rounded border border-border bg-surface px-1.5 py-0.5 text-xs" value={s.day ?? "route"} disabled={busy} onChange={(e) => patch(s.id, { day: e.target.value === "route" ? null : e.target.value, time: e.target.value === "route" ? null : s.time ?? null })}>
                    <option value="route">On the drive</option>
                    {days.map((d, di) => (
                      <option key={d} value={d}>Day {di + 1} · {fmtDateShort(d)}</option>
                    ))}
                  </select>
                  <button type="button" className="text-xs font-semibold text-coral hover:underline" disabled={busy} onClick={() => onRemove(s.id)}>
                    Remove
                  </button>
                </div>
              }
            />
          ))}
        </ol>
      )}
    </Disclosure>
  );
}
