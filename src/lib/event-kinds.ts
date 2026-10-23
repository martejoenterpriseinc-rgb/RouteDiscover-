import type { EventKind, Happening } from "./types";

export const EVENT_KINDS: Array<{ id: EventKind; label: string; emoji: string }> = [
  { id: "fair", label: "Fairs & carnivals", emoji: "🎡" },
  { id: "festival", label: "Festivals", emoji: "🎉" },
  { id: "concert", label: "Concerts & shows", emoji: "🎸" },
  { id: "car_show", label: "Car shows & cruise-ins", emoji: "🚗" },
  { id: "swap_meet", label: "Swap meets", emoji: "🔧" },
  { id: "flea_market", label: "Flea markets", emoji: "🧺" },
  { id: "yard_sale", label: "Yard & garage sales", emoji: "🏷️" },
  { id: "haunted", label: "Haunted houses", emoji: "🎃" },
  { id: "holiday_lights", label: "Holiday lights & Christmas", emoji: "🎄" },
  { id: "sports", label: "Sports", emoji: "🏟️" },
  { id: "market", label: "Farmers markets", emoji: "🥕" },
  { id: "other", label: "Other events", emoji: "📅" },
];
export const EVENT_KIND_BY_ID = Object.fromEntries(EVENT_KINDS.map((k) => [k.id, k])) as Record<EventKind, (typeof EVENT_KINDS)[number]>;

/** "Fri, Oct 23, 7:00 PM – 11:00 PM" or "Aug 6 – Aug 9" in the venue's own time zone. */
export function fmtEventWhen(h: Pick<Happening, "startsAt" | "endsAt" | "allDay" | "timezone">): string {
  const tz = h.timezone;
  const start = new Date(h.startsAt);
  const end = new Date(h.endsAt);
  const day = (d: Date) => d.toLocaleDateString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
  const time = (d: Date) => d.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const sameDay = day(start) === day(end);
  if (h.allDay) return sameDay ? day(start) : `${day(start)} – ${day(end)}`;
  if (sameDay) return `${day(start)}, ${time(start)} – ${time(end)}`;
  return `${day(start)} ${time(start)} – ${day(end)} ${time(end)}`;
}

/** Is the event on right now, coming up, or over? */
export function eventPhase(h: Pick<Happening, "startsAt" | "endsAt">, now = new Date()): "now" | "upcoming" | "past" {
  if (new Date(h.endsAt) < now) return "past";
  if (new Date(h.startsAt) <= now) return "now";
  return "upcoming";
}
