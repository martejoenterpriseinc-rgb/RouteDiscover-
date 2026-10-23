"use client";

import Link from "next/link";
import { fmtMiles } from "@/lib/geo";
import { fmtDateShort, isHistory, type TripRecord } from "@/lib/trips-client";
import { Badge } from "./ui";

export function TripCard({ trip }: { trip: TripRecord }) {
  const past = isHistory(trip);
  const days = Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000) + 1;
  return (
    <li>
      <Link href={`/app/trips/${trip.id}`} className="block rounded-xl border border-border bg-surface p-3 shadow-sm transition hover:border-blue">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{trip.name}</h3>
            <p className="truncate text-xs text-muted">
              {trip.origin.label} → {trip.destination.label}
            </p>
          </div>
          <div className="shrink-0 text-right text-xs">
            <div className="font-semibold text-navy dark:text-sky">
              {fmtDateShort(trip.startDate)}
              {trip.endDate !== trip.startDate ? ` – ${fmtDateShort(trip.endDate)}` : ""}
            </div>
            <div className="text-muted">{days} day{days === 1 ? "" : "s"}</div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {trip.status === "completed" ? <Badge tone="free">Completed</Badge> : trip.status === "canceled" ? <Badge>Canceled</Badge> : past ? <Badge>Past</Badge> : <Badge tone="blue">Planned</Badge>}
          {trip.distanceMiles ? <Badge>{fmtMiles(trip.distanceMiles)}</Badge> : null}
          <Badge>{trip.stops.length} stop{trip.stops.length === 1 ? "" : "s"}</Badge>
          {trip.isPublic && <Badge tone="paid">Shared</Badge>}
        </div>
      </Link>
    </li>
  );
}
