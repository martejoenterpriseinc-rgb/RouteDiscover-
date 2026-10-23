"use client";

import { CATEGORY_BY_ID } from "@/lib/categories";
import { appleMapsLink, mapsLink } from "@/lib/client";
import { fmtMiles } from "@/lib/geo";
import type { Charger, Hotel, Place } from "@/lib/types";
import { Badge } from "./ui";

function Distance({ item }: { item: { detourMiles?: number; alongMiles?: number; distanceMiles?: number } }) {
  if (item.alongMiles != null) {
    return (
      <span className="text-xs text-muted">
        <span className="font-semibold text-navy dark:text-sky">Mile {Math.round(item.alongMiles)}</span>
        {" · "}
        {fmtMiles(item.detourMiles)} off route
      </span>
    );
  }
  if (item.distanceMiles != null) return <span className="text-xs text-muted">{fmtMiles(item.distanceMiles)} away</span>;
  return null;
}

function Links({ item }: { item: { lat: number; lng: number; name: string; website?: string; phone?: string } }) {
  return (
    <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
      <a className="text-blue hover:underline" href={mapsLink(item, item.name)} target="_blank" rel="noreferrer">
        Google Maps
      </a>
      <a className="text-blue hover:underline" href={appleMapsLink(item, item.name)} target="_blank" rel="noreferrer">
        Apple Maps
      </a>
      {item.website && (
        <a className="text-blue hover:underline" href={item.website} target="_blank" rel="noreferrer">
          Website
        </a>
      )}
      {item.phone && (
        <a className="text-blue hover:underline" href={`tel:${item.phone}`}>
          Call
        </a>
      )}
    </div>
  );
}

function Card({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <li
      onClick={onClick}
      className={`cursor-pointer rounded-xl border bg-surface p-3 shadow-sm transition ${
        selected ? "border-orange ring-2 ring-orange/40" : "border-border hover:border-blue"
      }`}
    >
      {children}
    </li>
  );
}

export function PlaceCard({ place, selected, onClick }: { place: Place; selected?: boolean; onClick?: () => void }) {
  const cat = CATEGORY_BY_ID[place.category];
  return (
    <Card selected={selected} onClick={onClick}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {cat.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate font-semibold">{place.name}</h3>
            <Distance item={place} />
          </div>
          <p className="text-xs text-muted">
            {cat.label}
            {place.address ? ` · ${place.address}` : ""}
          </p>
          {place.openingHours && <p className="mt-1 text-xs text-muted">Hours: {place.openingHours}</p>}
          <Links item={place} />
        </div>
      </div>
    </Card>
  );
}

export function ChargerCard({ charger, selected, onClick, action }: { charger: Charger; selected?: boolean; onClick?: () => void; action?: React.ReactNode }) {
  return (
    <Card selected={selected} onClick={onClick}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          ⚡
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate font-semibold">{charger.name}</h3>
            <Distance item={charger} />
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {charger.supercharger && <Badge tone="tesla">Tesla Supercharger</Badge>}
            {charger.stalls ? <Badge>{charger.stalls} stalls</Badge> : null}
            {charger.maxKw ? <Badge>up to {Math.round(charger.maxKw)} kW</Badge> : null}
          </div>
          {charger.address && <p className="mt-1 text-xs text-muted">{charger.address}</p>}
          <Links item={charger} />
          {action && <div className="mt-2">{action}</div>}
        </div>
      </div>
    </Card>
  );
}

export function HotelCard({ hotel, selected, onClick }: { hotel: Hotel; selected?: boolean; onClick?: () => void }) {
  const tier = hotel.chargerTier;
  return (
    <Card selected={selected} onClick={onClick}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          🏨
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate font-semibold">{hotel.name}</h3>
            <Distance item={hotel} />
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {hotel.hasCharger ? (
              <>
                <Badge tone={tier === "free" ? "free" : tier === "paid" ? "paid" : "neutral"}>
                  {tier === "free" ? "Free charging" : tier === "paid" ? "Paid charging" : "Charging (cost unknown)"}
                </Badge>
                {hotel.teslaDestination && <Badge tone="tesla">Tesla Destination</Badge>}
                {hotel.chargerAccess === "guests" && <Badge>Guests only</Badge>}
                {hotel.chargerAccess === "public" && <Badge tone="blue">Open to public</Badge>}
                {hotel.chargerCount ? <Badge>{hotel.chargerCount} ports</Badge> : null}
              </>
            ) : (
              <Badge>No charger listed</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            {[hotel.brand, hotel.address].filter(Boolean).join(" · ")}
          </p>
          {hotel.hasCharger && hotel.connectors.length > 0 && (
            <p className="mt-1 text-xs text-muted">Connectors: {hotel.connectors.join(", ")}</p>
          )}
          {hotel.chargerNotes && <p className="mt-1 text-xs text-muted">Note: {hotel.chargerNotes}</p>}
          <Links item={hotel} />
        </div>
      </div>
    </Card>
  );
}
