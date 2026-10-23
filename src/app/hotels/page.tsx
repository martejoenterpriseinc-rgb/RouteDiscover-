"use client";

import { useMemo, useState } from "react";
import { HotelCard } from "@/components/Cards";
import { Map } from "@/components/Map";
import { PlaceInput } from "@/components/PlaceInput";
import { SplitLayout } from "@/components/SplitLayout";
import { TripPlanner } from "@/components/TripPlanner";
import { Button, Empty, ErrorNote, RadiusSlider, Segmented, SourceBanner } from "@/components/ui";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSearch } from "@/hooks/useSearch";
import { useTrip } from "@/hooks/useTrip";
import { fetchHotels } from "@/lib/client";
import { hotelMarker } from "@/lib/markers";
import type { GeoResult, Hotel, LatLng } from "@/lib/types";

type Scope = "route" | "destination" | "place";
type ChargeFilter = "any" | "charger" | "free" | "paid";
const NO_HOTELS: Hotel[] = [];

export default function HotelsPage() {
  const { trip } = useTrip();
  const geo = useGeolocation();
  const [scope, setScope] = useState<Scope>("destination");
  const [place, setPlace] = useState<GeoResult | undefined>();
  const [radius, setRadius] = useState(10);
  const [chargeFilter, setChargeFilter] = useState<ChargeFilter>("charger");
  const [teslaOnly, setTeslaOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const route = trip.route;
  const center: LatLng | null =
    scope === "destination" ? (trip.destination ?? null) : scope === "place" ? (place ?? null) : null;

  const areaKey =
    scope === "route"
      ? route
        ? `r:${route.origin.lat},${route.origin.lng}>${route.destination.lat},${route.destination.lng}:${trip.radiusMiles}`
        : ""
      : center
        ? `p:${center.lat},${center.lng}:${radius}`
        : "";

  const search = useSearch(
    areaKey,
    () =>
      fetchHotels(
        scope === "route" && route
          ? { route: route.geometry, radiusMiles: trip.radiusMiles }
          : { center: center!, radiusMiles: radius },
      ),
    NO_HOTELS,
  );
  const hotels = search.data;

  const visible = useMemo(
    () =>
      hotels.filter((h) => {
        if (chargeFilter === "charger" && !h.hasCharger) return false;
        if (chargeFilter === "free" && h.chargerTier !== "free") return false;
        if (chargeFilter === "paid" && h.chargerTier !== "paid") return false;
        if (teslaOnly && !h.teslaDestination) return false;
        return true;
      }),
    [hotels, chargeFilter, teslaOnly],
  );

  const counts = useMemo(
    () => ({
      charger: hotels.filter((h) => h.hasCharger).length,
      free: hotels.filter((h) => h.chargerTier === "free").length,
      paid: hotels.filter((h) => h.chargerTier === "paid").length,
      tesla: hotels.filter((h) => h.teslaDestination).length,
    }),
    [hotels],
  );

  const markers = useMemo(() => visible.map(hotelMarker), [visible]);

  const controls = (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border bg-surface p-3">
        <h1 className="font-semibold">🏨 Hotels with EV charging</h1>
        <p className="mt-1 text-xs text-muted">
          Sleep where you can plug in. Free vs. paid charging, Tesla Destination chargers, and guest-only
          access, all flagged.
        </p>
        <div className="mt-3">
          <Segmented
            label="Where"
            value={scope}
            onChange={setScope}
            options={[
              { value: "destination", label: "At destination" },
              { value: "route", label: "Along route" },
              { value: "place", label: "Near a place" },
            ]}
          />
        </div>
      </div>
      {scope === "route" && <TripPlanner compact />}
      {scope === "destination" && !trip.destination && (
        <div className="rounded-xl border border-border bg-surface p-3 text-sm text-muted">
          Set a destination on the Route tab first.
        </div>
      )}
      {scope === "destination" && trip.destination && (
        <div className="rounded-xl border border-border bg-surface p-3 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Destination</span>
          <div className="font-semibold">{trip.destination.label}</div>
        </div>
      )}
      {scope === "place" && (
        <div className="rounded-xl border border-border bg-surface p-3">
          <PlaceInput
            label="Near"
            placeholder="City or address"
            value={place}
            onChange={setPlace}
            onLocate={async () => {
              const p = await geo.locate();
              return p ? { label: "My location", lat: p.lat, lng: p.lng } : null;
            }}
            locating={geo.loading}
          />
        </div>
      )}
      {scope !== "route" && center && (
        <div className="rounded-xl border border-border bg-surface p-3">
          <RadiusSlider value={radius} min={1} max={40} onChange={setRadius} />
        </div>
      )}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Charging</span>
        <div className="hide-scrollbar overflow-x-auto">
          <Segmented
            label="Charging filter"
            value={chargeFilter}
            onChange={setChargeFilter}
            options={[
              { value: "charger", label: `Has charger (${counts.charger})` },
              { value: "free", label: `Free (${counts.free})` },
              { value: "paid", label: `Paid (${counts.paid})` },
              { value: "any", label: "All" },
            ]}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={teslaOnly}
            onChange={(e) => setTeslaOnly(e.target.checked)}
            className="h-4 w-4 accent-[#e82127]"
          />
          Tesla Destination charger only ({counts.tesla})
        </label>
      </div>
      <SourceBanner source={search.source} notice={search.notice} />
    </div>
  );

  const list = (
    <>
      {search.error && <ErrorNote>{search.error}</ErrorNote>}
      {areaKey && (
        <h2 className="font-semibold">
          {search.loading
            ? "Finding hotels…"
            : `${visible.length} hotel${visible.length === 1 ? "" : "s"} ${
                scope === "route" ? `within ${trip.radiusMiles} mi of your route` : `within ${radius} mi`
              }`}
        </h2>
      )}
      {search.done && visible.length === 0 && !search.error && (
        <Empty>
          No hotels match.{" "}
          {hotels.length > 0 && chargeFilter !== "any" && (
            <Button variant="ghost" onClick={() => setChargeFilter("any")}>
              Show all {hotels.length} hotels
            </Button>
          )}
        </Empty>
      )}
      <ul className="flex flex-col gap-2">
        {visible.map((h) => (
          <HotelCard key={h.id} hotel={h} selected={selected === h.id} onClick={() => setSelected(h.id)} />
        ))}
      </ul>
    </>
  );

  return (
    <SplitLayout
      controls={controls}
      list={list}
      map={
        <Map
          route={scope === "route" ? route?.geometry : undefined}
          markers={markers}
          selectedId={selected}
          onSelect={setSelected}
          here={geo.position}
          circle={scope !== "route" && center ? { center, radiusMiles: radius } : null}
          fitKey={areaKey || "none"}
        />
      }
    />
  );
}
