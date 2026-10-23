"use client";

import { CONNECTOR_LABEL, extraFees, networkById, pricingSummary, speedLabel } from "@/lib/ev-networks";
import { CATEGORY_BY_ID } from "@/lib/categories";
import { appleMapsLink, mapsLink } from "@/lib/client";
import { fmtMiles } from "@/lib/geo";
import type { Charger, Hotel, Place } from "@/lib/types";
import { Badge } from "./ui";
import { DetailsButton } from "./DetailsButton";
import { chargerAsPlace, hotelAsPlace } from "./AddToTrip";

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
  sponsored,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  sponsored?: boolean;
}) {
  return (
    <li
      onClick={onClick}
      className={`cursor-pointer rounded-xl border bg-surface p-3 shadow-sm transition ${
        selected ? "border-orange ring-2 ring-orange/40" : sponsored ? "border-orange/60 bg-cream/60 hover:border-orange" : "border-border hover:border-blue"
      }`}
    >
      {children}
    </li>
  );
}

function ListingBadges({ item }: { item: { sponsored?: boolean; claimed?: boolean; rating?: number; reviewCount?: number; google?: { rating?: number; ratingCount?: number } } }) {
  const g = item.google;
  if (!item.sponsored && !item.claimed && !item.rating && !g?.rating) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {item.sponsored && <Badge tone="paid">★ Sponsored</Badge>}
      {item.claimed && <Badge tone="blue">✓ Verified by owner</Badge>}
      {item.rating ? <Badge tone="free">★ {item.rating.toFixed(1)} ({item.reviewCount})</Badge> : g?.rating ? <Badge>★ {g.rating.toFixed(1)} Google{g.ratingCount ? ` (${g.ratingCount.toLocaleString()})` : ""}</Badge> : null}
    </div>
  );
}

export function PlaceCard({ place, selected, onClick, action, details = true }: { place: Place; selected?: boolean; onClick?: () => void; action?: React.ReactNode; details?: boolean }) {
  const cat = CATEGORY_BY_ID[place.category];
  return (
    <Card selected={selected} onClick={onClick} sponsored={place.sponsored}>
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
          <ListingBadges item={place} />
          <OutdoorBadges place={place} />
          {place.hours && place.hours.openNow !== null && (
            <p className="mt-1"><Badge tone={place.hours.openNow ? "free" : "paid"}>{place.hours.label}</Badge></p>
          )}
          {place.openingHours && <p className="mt-1 text-xs text-muted">Hours: {place.openingHours}</p>}
          <Links item={place} />
          {(action || details) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {details && <DetailsButton place={place} listingId={place.listingId} />}
              {action}
            </div>
          )}
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
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <NetworkBadge id={charger.network} label={charger.networkLabel} />
            <Badge tone={charger.speedTier === "ultra" || charger.speedTier === "fast" ? "blue" : "neutral"}>{speedLabel(charger.speedTier, charger.maxKw)}</Badge>
            {charger.stalls ? <Badge>{charger.stalls} stalls</Badge> : null}
            {charger.connectorTypes.map((t) => (
              <Badge key={t}>{CONNECTOR_LABEL[t]}</Badge>
            ))}
          </div>
          <p className="mt-1 text-sm">
            <span className={`font-semibold ${charger.costTier === "free" ? "text-green" : ""}`}>{pricingSummary(charger.pricing, charger.costTier)}</span>
            {extraFees(charger.pricing).length > 0 && <span className="text-xs text-muted"> · {extraFees(charger.pricing).join(" · ")}</span>}
          </p>
          {charger.pricing?.raw && (charger.pricing.perKwh != null || charger.pricing.perMinute != null) && charger.pricing.raw.length > 24 && (
            <p className="text-[11px] text-muted" title="As published by the data source">Source wording: {charger.pricing.raw.slice(0, 140)}</p>
          )}
          {charger.address && <p className="mt-1 text-xs text-muted">{charger.address}</p>}
          <Links item={charger} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DetailsButton place={chargerAsPlace(charger)} />
            {action}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function HotelCard({ hotel, selected, onClick, action }: { hotel: Hotel; selected?: boolean; onClick?: () => void; action?: React.ReactNode }) {
  const tier = hotel.chargerTier;
  return (
    <Card selected={selected} onClick={onClick} sponsored={hotel.sponsored}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {hotel.kind === "campground" ? "🏕️" : "🏨"}
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
            {[hotel.kind === "campground" ? "Campground" : null, hotel.brand, hotel.address].filter(Boolean).join(" · ")}
          </p>
          <ListingBadges item={hotel} />
          {hotel.hasCharger && hotel.connectors.length > 0 && (
            <p className="mt-1 text-xs text-muted">Connectors: {hotel.connectors.join(", ")}</p>
          )}
          {hotel.chargerNotes && <p className="mt-1 text-xs text-muted">Note: {hotel.chargerNotes}</p>}
          <Links item={hotel} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DetailsButton place={hotelAsPlace(hotel)} listingId={hotel.listingId} />
            {action}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Network pill in the network's own colour. */
export function NetworkBadge({ id, label }: { id: string; label: string }) {
  const n = networkById(id);
  const color = id === "unknown" ? "#9aa3b5" : n.color;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ borderColor: `${color}66`, color, background: `${color}14` }}>
      <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}

const SAC: Record<string, string> = { hiking: "Easy", mountain_hiking: "Moderate", demanding_mountain_hiking: "Hard", alpine_hiking: "Very hard", demanding_alpine_hiking: "Expert", difficult_alpine_hiking: "Expert" };

/** Trail length/difficulty and camping fee/land-manager flags from the map data. */
export function OutdoorBadges({ place }: { place: Place }) {
  const t = place.tags ?? {};
  const out: React.ReactNode[] = [];
  if (place.category === "hiking" || place.category === "biking") {
    if (t.distance) out.push(<Badge key="d">{/mi|km/i.test(t.distance) ? t.distance : `${t.distance} km`}</Badge>);
    if (t.sac_scale && SAC[t.sac_scale]) out.push(<Badge key="s" tone={SAC[t.sac_scale] === "Easy" ? "free" : "paid"}>{SAC[t.sac_scale]}</Badge>);
    if (t.surface) out.push(<Badge key="su">{t.surface.replace(/_/g, " ")}</Badge>);
    if (/^osm-(relation|way)-/.test(place.id)) out.push(<Badge key="m" tone="blue">Tap to show trail on map</Badge>);
  }
  if (place.category === "camping_free" || place.category === "campgrounds") {
    if (t.fee === "no" || place.category === "camping_free") out.push(<Badge key="f" tone="free">{t.fee === "no" ? "Free" : "Free / dispersed"}</Badge>);
    if (t.fee === "yes" || t.charge) out.push(<Badge key="p" tone="paid">{t.charge ? `Fee: ${t.charge}` : "Fee"}</Badge>);
    if (/bureau of land management|\bblm\b/i.test(t.operator ?? "")) out.push(<Badge key="blm" tone="blue">BLM</Badge>);
    if (/forest service|usfs/i.test(t.operator ?? "")) out.push(<Badge key="usfs" tone="blue">USFS</Badge>);
    if (/army corps/i.test(t.operator ?? "")) out.push(<Badge key="usace" tone="blue">Army Corps</Badge>);
    if (t.backcountry === "yes") out.push(<Badge key="bc">Backcountry</Badge>);
    if (t.reservation === "required") out.push(<Badge key="r" tone="paid">Reservation required</Badge>);
  }
  if (place.category === "hotsprings" && t.fee) out.push(<Badge key="hf" tone={t.fee === "no" ? "free" : "paid"}>{t.fee === "no" ? "Free" : "Fee"}</Badge>);
  if (out.length === 0) return null;
  return <div className="mt-1 flex flex-wrap gap-1">{out}</div>;
}
