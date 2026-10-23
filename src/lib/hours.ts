import OpeningHours from "opening_hours";
import tzlookup from "tz-lookup";
import type { HoursStatus, Place } from "./types";

type Period = { open: { day: number; hour: number; minute: number }; close?: { day: number; hour: number; minute: number } };
type HoursSource = Pick<Place, "lat" | "lng" | "openingHours" | "provider"> & { google?: { periods?: Period[]; utcOffsetMinutes?: number } };

const WEEK = 7 * 24 * 60;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function timezoneFor(lat: number, lng: number): string | undefined {
  try {
    return tzlookup(lat, lng);
  } catch {
    return undefined;
  }
}

/** Offset of `tz` from UTC at instant `at`, in minutes. */
export function tzOffsetMinutes(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** The instant at which the wall clock in `tz` reads `localIso` (YYYY-MM-DDTHH:MM). */
export function instantFor(tz: string, localIso: string): Date {
  const guess = new Date(`${localIso}:00Z`);
  const off = tzOffsetMinutes(tz, guess);
  const first = new Date(guess.getTime() - off * 60000);
  const off2 = tzOffsetMinutes(tz, first);
  return off2 === off ? first : new Date(guess.getTime() - off2 * 60000);
}

const fmtClock = (minutes: number) => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
};

/** Google "Monday: 9:00 AM – 5:00 PM; …" → periods. */
function parseWeekdayDescriptions(text: string): Period[] | null {
  const out: Period[] = [];
  let matched = false;
  for (const part of text.split(";")) {
    const m = part.trim().match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday):\s*(.*)$/i);
    if (!m) continue;
    matched = true;
    const day = DAYS.findIndex((d) => d.toLowerCase() === m[1].toLowerCase());
    const rest = m[2].trim();
    if (/open 24 hours/i.test(rest)) {
      out.push({ open: { day, hour: 0, minute: 0 }, close: { day: (day + 1) % 7, hour: 0, minute: 0 } });
      continue;
    }
    if (/closed/i.test(rest)) continue;
    for (const range of rest.split(",")) {
      const r = range.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[–-]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
      if (!r) continue;
      const to24 = (h: string, ap: string | undefined, fallback?: string) => {
        let hh = Number(h) % 12;
        if ((ap ?? fallback ?? "").toUpperCase() === "PM") hh += 12;
        return hh;
      };
      const oh = to24(r[1], r[3], r[6]);
      const om = Number(r[2] ?? 0);
      const ch = to24(r[4], r[6]);
      const cm = Number(r[5] ?? 0);
      const wraps = ch * 60 + cm <= oh * 60 + om;
      out.push({ open: { day, hour: oh, minute: om }, close: { day: wraps ? (day + 1) % 7 : day, hour: ch, minute: cm } });
    }
  }
  return matched ? out : null;
}

function statusFromPeriods(periods: Period[], localMinutesOfWeek: number): HoursStatus {
  if (periods.length === 0) return { openNow: false, label: "Closed today" };
  let bestOpen: number | null = null;
  let closesAt: number | null = null;
  for (const p of periods) {
    const start = p.open.day * 1440 + p.open.hour * 60 + p.open.minute;
    if (!p.close) return { openNow: true, label: "Open 24 hours" };
    let end = p.close.day * 1440 + p.close.hour * 60 + p.close.minute;
    if (end <= start) end += WEEK;
    for (const shift of [-WEEK, 0, WEEK]) {
      const s = start + shift;
      const e = end + shift;
      if (localMinutesOfWeek >= s && localMinutesOfWeek < e) closesAt = e;
      else if (s > localMinutesOfWeek && (bestOpen === null || s < bestOpen)) bestOpen = s;
    }
  }
  if (closesAt !== null) {
    const closeMin = ((closesAt % WEEK) + WEEK) % WEEK;
    const sameDay = Math.floor(closeMin / 1440) === Math.floor(localMinutesOfWeek / 1440);
    return { openNow: true, label: `Open · closes ${sameDay ? "" : `${SHORT[Math.floor(closeMin / 1440)]} `}${fmtClock(closeMin % 1440)}` };
  }
  if (bestOpen !== null) {
    const openMin = ((bestOpen % WEEK) + WEEK) % WEEK;
    const sameDay = Math.floor(openMin / 1440) === Math.floor(localMinutesOfWeek / 1440);
    return { openNow: false, label: `Closed · opens ${sameDay ? "" : `${SHORT[Math.floor(openMin / 1440)]} `}${fmtClock(openMin % 1440)}` };
  }
  return { openNow: false, label: "Closed" };
}

/**
 * Open or closed at `at`, evaluated in the place's own time zone. Understands Google's
 * structured periods, Google's weekday text, and OpenStreetMap opening_hours syntax.
 */
export function hoursStatus(p: HoursSource, at: Date = new Date()): HoursStatus {
  const timezone = timezoneFor(p.lat, p.lng);
  const unknown: HoursStatus = { openNow: null, label: "Hours not listed", timezone };
  try {
    if (p.google?.periods?.length) {
      const off = p.google.utcOffsetMinutes ?? (timezone ? tzOffsetMinutes(timezone, at) : 0);
      const local = new Date(at.getTime() + off * 60000);
      const mow = local.getUTCDay() * 1440 + local.getUTCHours() * 60 + local.getUTCMinutes();
      return { ...statusFromPeriods(p.google.periods, mow), timezone };
    }
    const text = (p.openingHours ?? "").trim();
    if (!text) return unknown;
    const periods = parseWeekdayDescriptions(text);
    if (periods) {
      const off = timezone ? tzOffsetMinutes(timezone, at) : 0;
      const local = new Date(at.getTime() + off * 60000);
      const mow = local.getUTCDay() * 1440 + local.getUTCHours() * 60 + local.getUTCMinutes();
      return { ...statusFromPeriods(periods, mow), timezone };
    }
    // OpenStreetMap syntax. The library works in the runtime's local zone, so shift the instant
    // by the difference between the place's zone and ours and shift results back.
    const oh = new OpeningHours(text, { lat: p.lat, lon: p.lng, address: { country_code: "us", state: "" } });
    const delta = timezone ? tzOffsetMinutes(timezone, at) + at.getTimezoneOffset() : 0;
    const shifted = new Date(at.getTime() + delta * 60000);
    const open = oh.getState(shifted);
    const next = oh.getNextChange(shifted);
    if (next === undefined) return { openNow: open, label: open ? "Open 24 hours" : "Closed", timezone };
    const sameDay = next.getDate() === shifted.getDate();
    const clock = fmtClock(next.getHours() * 60 + next.getMinutes());
    const when = `${sameDay ? "" : `${SHORT[next.getDay()]} `}${clock}`;
    return { openNow: open, label: open ? `Open · closes ${when}` : `Closed · opens ${when}`, timezone };
  } catch {
    return unknown;
  }
}

export function withHours<T extends HoursSource>(items: T[], at: Date = new Date()): Array<T & { hours: HoursStatus }> {
  return items.map((p) => ({ ...p, hours: hoursStatus(p, at) }));
}
