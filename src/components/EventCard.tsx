"use client";

import { AddToTripButton } from "./AddToTrip";
import { Badge } from "./ui";
import { EVENT_KIND_BY_ID, eventPhase, fmtEventWhen } from "@/lib/event-kinds";
import { fmtMiles } from "@/lib/geo";
import type { Happening, Place } from "@/lib/types";

export function eventAsPlace(h: Happening): Place {
  return { id: h.id, name: h.title, category: h.kind === "market" || h.kind === "flea_market" ? "flea" : "fairgrounds", lat: h.lat, lng: h.lng, address: h.address ?? h.venue, website: h.url, alongMiles: h.alongMiles, detourMiles: h.detourMiles, distanceMiles: h.distanceMiles };
}

export function EventCard({ event: h, selected, onClick }: { event: Happening; selected?: boolean; onClick?: () => void }) {
  const kind = EVENT_KIND_BY_ID[h.kind];
  const phase = eventPhase(h);
  const dist = h.distanceMiles != null ? `${fmtMiles(h.distanceMiles)} away` : h.alongMiles != null ? `Mile ${Math.round(h.alongMiles)}${h.detourMiles != null ? ` · ${fmtMiles(h.detourMiles)} off route` : ""}` : "";
  return (
    <li onClick={onClick} className={`cursor-pointer rounded-xl border bg-surface p-3 shadow-sm transition ${selected ? "border-orange ring-2 ring-orange/40" : "border-border hover:border-blue"}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>{kind?.emoji ?? "📅"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-semibold">{h.title}</h3>
            {dist && <span className="shrink-0 text-xs text-muted">{dist}</span>}
          </div>
          <p className="mt-0.5 text-sm font-semibold text-navy dark:text-sky">{fmtEventWhen(h)}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge tone="blue">{kind?.label ?? "Event"}</Badge>
            {phase === "now" && <Badge tone="free">Happening now</Badge>}
            {h.price && <Badge>{h.price}</Badge>}
            {h.source === "community" && <Badge tone="neutral">Added by a traveler</Badge>}
            {h.source === "demo" && <Badge tone="neutral">Sample</Badge>}
          </div>
          {(h.venue || h.address) && <p className="mt-1 text-xs text-muted">{[h.venue, h.address].filter(Boolean).join(" · ")}</p>}
          {h.description && <p className="mt-1 text-sm text-muted">{h.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold" onClick={(e) => e.stopPropagation()}>
            {h.url && <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">Details & tickets →</a>}
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">Directions</a>
            <AddToTripButton place={eventAsPlace(h)} />
          </div>
        </div>
      </div>
    </li>
  );
}
