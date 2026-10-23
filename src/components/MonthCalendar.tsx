"use client";

import Link from "next/link";
import { useState } from "react";
import type { TripRecord } from "@/lib/trips-client";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = ["#1f8ae6", "#f15a29", "#4caf50", "#8e44ad", "#f7941d", "#00acc1"];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Month grid with trips drawn as bars across the days they cover. */
export function MonthCalendar({ trips, initialMonth }: { trips: TripRecord[]; initialMonth?: Date }) {
  const [cursor, setCursor] = useState(() => {
    const d = initialMonth ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const todayIso = iso(new Date());
  const label = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const colorFor = (t: TripRecord) => COLORS[Math.abs([...t.id].reduce((h, c) => h * 31 + c.charCodeAt(0), 7)) % COLORS.length];

  return (
    <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="rounded-full px-3 py-1 text-lg hover:bg-cream" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">
          ‹
        </button>
        <div className="flex items-center gap-2">
          <h2 className="font-bold">{label}</h2>
          <button type="button" className="rounded-full border border-border px-2 py-0.5 text-xs text-muted hover:bg-cream" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Today
          </button>
        </div>
        <button type="button" className="rounded-full px-3 py-1 text-lg hover:bg-cream" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
        {DOW.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {cells.map((d) => {
          const day = iso(d);
          const inMonth = d.getMonth() === month;
          const dayTrips = trips.filter((t) => t.startDate <= day && t.endDate >= day);
          return (
            <div key={day} className={`min-h-[76px] bg-surface p-1 ${inMonth ? "" : "opacity-40"}`}>
              <div className="flex items-center justify-between">
                <Link
                  href={`/app/trips/new?date=${day}`}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold hover:bg-cream ${
                    day === todayIso ? "bg-orange text-white" : ""
                  }`}
                  title={`Plan a trip starting ${day}`}
                >
                  {d.getDate()}
                </Link>
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                {dayTrips.slice(0, 2).map((t) => (
                  <Link
                    key={t.id}
                    href={`/app/trips/${t.id}`}
                    className={`truncate rounded px-1 text-[11px] font-semibold text-white ${t.status !== "planned" ? "opacity-60" : ""}`}
                    style={{ background: colorFor(t) }}
                    title={t.name}
                  >
                    {t.startDate === day ? t.name : "·"}
                  </Link>
                ))}
                {dayTrips.length > 2 && <span className="text-[10px] text-muted">+{dayTrips.length - 2} more</span>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Tap a date to plan a trip starting that day. Tap a bar to open the trip.</p>
    </div>
  );
}
