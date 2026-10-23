import { haversineMiles } from "./geo";
import type { TripRecord } from "./trips-client";
import type { TripStop } from "@/db/schema";

export type ItineraryView = "route" | string;

/** Stops that belong to a view: the drive, or one day of the stay. */
export function stopsFor(trip: TripRecord, view: ItineraryView): TripStop[] {
  const list = trip.stops.filter((s) => (view === "route" ? !s.day : s.day === view));
  return view === "route"
    ? list
    : [...list].sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.addedAt.localeCompare(b.addedAt));
}

export const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/** Nearest-neighbour order from the place you're staying, with a time for each stop. */
export function planDay(stops: TripStop[], from: { lat: number; lng: number }, opts = { startHour: 9, minutesPerStop: 75, mph: 30 }): TripStop[] {
  const left = [...stops];
  const out: TripStop[] = [];
  let at = from;
  let minutes = opts.startHour * 60;
  while (left.length) {
    left.sort((a, b) => haversineMiles(at, a) - haversineMiles(at, b));
    const next = left.shift()!;
    minutes += Math.round((haversineMiles(at, next) / opts.mph) * 60);
    const h = Math.min(23, Math.floor(minutes / 60));
    const m = Math.round((minutes % 60) / 5) * 5;
    out.push({ ...next, time: `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` });
    minutes += opts.minutesPerStop;
    at = next;
  }
  return out;
}

