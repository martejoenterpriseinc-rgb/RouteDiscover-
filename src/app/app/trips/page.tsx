"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MonthCalendar } from "@/components/MonthCalendar";
import { TripCard } from "@/components/TripCard";
import { Empty, ErrorNote, Segmented } from "@/components/ui";
import { isHistory, listTrips, type TripRecord } from "@/lib/trips-client";

type View = "upcoming" | "calendar" | "history";

function TripsInner() {
  const params = useSearchParams();
  const initial = (params.get("view") as View) || "upcoming";
  const [view, setView] = useState<View>(["upcoming", "calendar", "history"].includes(initial) ? initial : "upcoming");
  const [trips, setTrips] = useState<TripRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTrips()
      .then(setTrips)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load trips."));
  }, []);

  const upcoming = (trips ?? []).filter((t) => !isHistory(t)).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const history = (trips ?? []).filter(isHistory).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const totalMiles = history.reduce((m, t) => m + (t.distanceMiles ?? 0), 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Trips</h1>
        <Link href="/app/trips/new" className="rounded-xl bg-gradient-to-r from-coral to-orange px-4 py-2 text-sm font-semibold text-white shadow">
          + Plan a trip
        </Link>
      </div>
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: "upcoming", label: `Upcoming (${upcoming.length})` },
          { value: "calendar", label: "Calendar" },
          { value: "history", label: `History (${history.length})` },
        ]}
      />
      {error && <ErrorNote>{error}</ErrorNote>}
      {trips === null && !error && <p className="text-sm text-muted">Loading trips…</p>}
      {trips && view === "upcoming" && (
        upcoming.length === 0 ? (
          <Empty>
            No upcoming trips. <Link href="/app/trips/new" className="text-blue hover:underline">Plan one</Link> and we&apos;ll keep your stops, dates and route together.
          </Empty>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((t) => (
              <TripCard key={t.id} trip={t} />
            ))}
          </ul>
        )
      )}
      {trips && view === "calendar" && <MonthCalendar trips={trips} />}
      {trips && view === "history" && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Trips taken", value: history.length },
              { label: "Miles driven", value: Math.round(totalMiles).toLocaleString() },
              { label: "Stops saved", value: history.reduce((n, t) => n + t.stops.length, 0) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-surface p-3 text-center">
                <div className="text-2xl font-extrabold text-navy dark:text-sky">{s.value}</div>
                <div className="text-xs text-muted">{s.label}</div>
              </div>
            ))}
          </div>
          {history.length === 0 ? (
            <Empty>Your travel history will appear here once a trip is completed or its dates have passed.</Empty>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {history.map((t) => (
                <TripCard key={t.id} trip={t} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function TripsPage() {
  return (
    <Suspense>
      <TripsInner />
    </Suspense>
  );
}
