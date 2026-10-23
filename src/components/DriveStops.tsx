"use client";

import { useDriveStops } from "@/hooks/useDriveStops";
import { CATEGORY_BY_ID } from "@/lib/categories";
import type { Place } from "@/lib/types";
import { Disclosure } from "./Disclosure";
import { ErrorNote } from "./ui";

/** Checkbox on a result card: tick it and the drive is re-planned through this place. */
export function StopToggle({ place }: { place: Place }) {
  const { has, toggle, busy, canRoute } = useDriveStops();
  if (!canRoute) return null;
  const on = has(place.id);
  return (
    <label
      onClick={(e) => e.stopPropagation()}
      className={`flex cursor-pointer select-none items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
        on ? "border-navy bg-navy text-white dark:border-sky dark:bg-sky dark:text-navy" : "border-border bg-surface text-foreground hover:border-navy"
      } ${busy ? "opacity-60" : ""}`}
    >
      <input type="checkbox" className="h-4 w-4 accent-[#1c2b5a]" checked={on} disabled={busy} onChange={() => void toggle(place)} aria-label={`${on ? "Remove" : "Add"} ${place.name} ${on ? "from" : "to"} my route`} />
      {on ? "On my route" : "Add to route"}
    </label>
  );
}

/** The stops ticked so far, in driving order, with remove buttons. */
export function DriveStopsPanel() {
  const { stops, remove, clear, busy, error } = useDriveStops();
  if (stops.length === 0 && !error) return null;
  return (
    <Disclosure
      id="route-stops"
      title={`🧭 Your stops (${stops.length})`}
      summary={stops.map((s) => s.name).join(" · ") || "No stops yet"}
      aside={
        stops.length > 0 ? (
          <button type="button" className="text-xs font-semibold text-muted hover:text-foreground" disabled={busy} onClick={() => void clear()}>
            Clear all
          </button>
        ) : null
      }
      className="rounded-xl border border-navy/30 bg-surface p-3"
      bodyClassName="mt-2 flex flex-col gap-1"
    >
      {error && <ErrorNote>{error}</ErrorNote>}
      {busy && <p className="text-xs text-muted">Re-planning the drive…</p>}
      <ol className="flex flex-col gap-1">
        {stops.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-cream dark:hover:bg-background">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white dark:bg-sky dark:text-navy">{i + 1}</span>
            <span aria-hidden>{CATEGORY_BY_ID[s.category]?.emoji}</span>
            <span className="min-w-0 flex-1 truncate">
              {s.name}
              {s.alongMiles != null && <span className="text-xs text-muted"> · mile {Math.round(s.alongMiles)}</span>}
            </span>
            <button type="button" className="shrink-0 text-xs font-semibold text-muted hover:text-red-600" disabled={busy} onClick={() => void remove(s.id)} aria-label={`Remove ${s.name}`}>
              ✕
            </button>
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-muted">Stops are driven in mile order. Tick more places below, or save this drive as a trip.</p>
    </Disclosure>
  );
}
