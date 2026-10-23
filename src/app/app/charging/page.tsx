"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ActiveTripBanner, AddToTripButton, chargerAsPlace } from "@/components/AddToTrip";
import { ChargerCard, PlaceCard } from "@/components/Cards";
import { Map } from "@/components/Map";
import { SplitLayout } from "@/components/SplitLayout";
import { TripPlanner } from "@/components/TripPlanner";
import { Button, CategoryChips, Empty, ErrorNote, RadiusSlider, Segmented, SourceBanner } from "@/components/ui";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSearch } from "@/hooks/useSearch";
import { useTrip } from "@/hooks/useTrip";
import { WALKABLE_CATEGORIES } from "@/lib/categories";
import { fetchChargers, fetchPlaces } from "@/lib/client";
import { chargerMarker, placeMarker } from "@/lib/markers";
import type { CategoryId, Charger, LatLng, Place } from "@/lib/types";

type Scope = "route" | "me" | "destination";
const NO_CHARGERS: Charger[] = [];
const NO_PLACES: Place[] = [];
const POINT_RADIUS = 25;

export default function ChargingPage() {
  const { trip } = useTrip();
  const geo = useGeolocation();
  const [scope, setScope] = useState<Scope>("route");
  const [radius, setRadius] = useState(5);
  const [selected, setSelected] = useState<string | null>(null);
  const [walkRadius, setWalkRadius] = useState(0.5);
  const [walkCats, setWalkCats] = useState<CategoryId[]>(["food", "coffee", "shopping", "restrooms"]);

  const route = trip.route;
  const center: LatLng | null =
    scope === "me" ? geo.position : scope === "destination" ? (trip.destination ?? null) : null;
  const pointRadius = Math.max(radius, POINT_RADIUS);

  const areaKey =
    scope === "route"
      ? route
        ? `r:${route.origin.lat},${route.origin.lng}>${route.destination.lat},${route.destination.lng}:${radius}`
        : ""
      : center
        ? `p:${center.lat},${center.lng}:${pointRadius}`
        : "";

  const locate = geo.locate;
  useEffect(() => {
    if (scope === "me") locate();
  }, [scope, locate]);

  const chargers = useSearch(
    areaKey,
    () =>
      fetchChargers(
        scope === "route" && route
          ? { route: route.geometry, radiusMiles: radius }
          : { center: center!, radiusMiles: pointRadius },
      ),
    NO_CHARGERS,
  );

  const selectedCharger = chargers.data.find((c) => c.id === selected) ?? null;
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedId = selectedCharger?.id;
  useEffect(() => {
    if (selectedId) panelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [selectedId]);
  const walkKey = selectedCharger && walkCats.length ? `${selectedCharger.id}|${walkRadius}|${walkCats.join(",")}` : "";
  const nearby = useSearch(
    walkKey,
    () => fetchPlaces({ center: selectedCharger!, radiusMiles: walkRadius }, walkCats),
    NO_PLACES,
  );

  const markers = useMemo(
    () => [...chargers.data.map(chargerMarker), ...nearby.data.map(placeMarker)],
    [chargers.data, nearby.data],
  );

  const controls = (
    <div className="flex flex-col gap-3">
      <ActiveTripBanner />
      <div className="rounded-xl border border-border bg-surface p-3">
        <h1 className="font-semibold">⚡ Tesla Supercharger stops</h1>
        <p className="mt-1 text-xs text-muted">
          Find Superchargers along your route, then see what you can walk to while the car charges.
        </p>
        <div className="mt-3">
          <Segmented
            label="Search scope"
            value={scope}
            onChange={(s) => {
              setScope(s);
              setSelected(null);
            }}
            options={[
              { value: "route", label: "Along route" },
              { value: "me", label: "Near me" },
              { value: "destination", label: "At destination" },
            ]}
          />
        </div>
      </div>
      {scope === "route" && <TripPlanner compact />}
      {scope === "me" && !geo.position && (
        <div className="rounded-xl border border-border bg-surface p-3 text-sm">
          {geo.loading ? "Getting your location…" : (geo.error ?? "Location needed.")}{" "}
          {!geo.loading && (
            <Button variant="ghost" onClick={() => geo.locate()}>
              Try again
            </Button>
          )}
        </div>
      )}
      {scope === "destination" && !trip.destination && (
        <div className="rounded-xl border border-border bg-surface p-3 text-sm text-muted">
          Set a destination on the Route tab first.
        </div>
      )}
      {scope === "route" && route && (
        <div className="rounded-xl border border-border bg-surface p-3">
          <RadiusSlider label="Miles off route" value={radius} min={1} max={25} onChange={setRadius} />
        </div>
      )}
      <SourceBanner source={chargers.source} notice={chargers.notice} />
    </div>
  );

  const list = (
    <>
      {chargers.error && <ErrorNote>{chargers.error}</ErrorNote>}
      {selectedCharger && (
        <div ref={panelRef} className="scroll-mt-4 rounded-xl border-2 border-orange bg-cream p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold">While you charge at {selectedCharger.name}</h2>
              <p className="text-xs text-muted">Walkable spots so you can make the most of a 20–40 minute stop.</p>
            </div>
            <Button variant="ghost" onClick={() => setSelected(null)} aria-label="Close">
              ✕
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Walk</span>
            <Segmented
              value={String(walkRadius)}
              onChange={(v) => setWalkRadius(Number(v))}
              options={[
                { value: "0.25", label: "¼ mi" },
                { value: "0.5", label: "½ mi" },
                { value: "1", label: "1 mi" },
              ]}
            />
          </div>
          <CategoryChips value={walkCats} onChange={setWalkCats} only={WALKABLE_CATEGORIES} />
          <SourceBanner source={nearby.source} />
          {nearby.loading ? (
            <p className="text-sm text-muted">Looking around…</p>
          ) : nearby.data.length === 0 ? (
            <Empty>Nothing walkable found in that range. Try 1 mile or more categories.</Empty>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {nearby.data.map((p) => (
                <PlaceCard key={p.id} place={p} action={<AddToTripButton place={p} />} />
              ))}
            </ul>
          )}
        </div>
      )}
      {areaKey && (
        <h2 className="font-semibold">
          {chargers.loading
            ? "Finding Superchargers…"
            : `${chargers.data.length} Supercharger${chargers.data.length === 1 ? "" : "s"} ${
                scope === "route" ? `within ${radius} mi of your route` : `within ${pointRadius} mi`
              }`}
        </h2>
      )}
      {chargers.done && chargers.data.length === 0 && !chargers.error && (
        <Empty>No Tesla Superchargers found in that range.</Empty>
      )}
      <ul className="flex flex-col gap-2">
        {chargers.data.map((c) => (
          <ChargerCard
            key={c.id}
            charger={c}
            selected={selected === c.id}
            onClick={() => setSelected(c.id)}
            action={
              <div className="flex flex-wrap gap-2">
                {selected !== c.id && (
                  <Button
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(c.id);
                    }}
                  >
                    🚶 What&apos;s walkable while I charge?
                  </Button>
                )}
                <AddToTripButton place={chargerAsPlace(c)} />
              </div>
            }
          />
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
          circle={
            selectedCharger
              ? { center: selectedCharger, radiusMiles: walkRadius }
              : center
                ? { center, radiusMiles: pointRadius }
                : null
          }
          fitKey={areaKey || "none"}
        />
      }
    />
  );
}
