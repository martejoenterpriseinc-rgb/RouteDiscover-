"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ActiveTripBanner, AddToTripButton, chargerAsPlace } from "@/components/AddToTrip";
import { ChargerCard, NetworkBadge, PlaceCard } from "@/components/Cards";
import { Disclosure } from "@/components/Disclosure";
import { Map } from "@/components/Map";
import { SplitLayout } from "@/components/SplitLayout";
import { TripPlanner } from "@/components/TripPlanner";
import { Button, CategoryChips, Empty, ErrorNote, RadiusSlider, Segmented, SourceBanner } from "@/components/ui";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSearch } from "@/hooks/useSearch";
import { useTrip } from "@/hooks/useTrip";
import { WALKABLE_CATEGORIES } from "@/lib/categories";
import { fetchChargers, fetchPlaces } from "@/lib/client";
import { type ConnectorType, networkById } from "@/lib/ev-networks";
import { chargerMarker, placeMarker } from "@/lib/markers";
import type { CategoryId, Charger, LatLng, Place } from "@/lib/types";

type Scope = "route" | "me" | "destination";
const NO_CHARGERS: Charger[] = [];
const NO_PLACES: Place[] = [];
const POINT_RADIUS = 25;
type Speed = "any" | "l2" | "50" | "150" | "250";
const SPEED_KW: Record<Speed, number> = { any: 0, l2: 3, "50": 50, "150": 150, "250": 250 };
type Cost = "any" | "free" | "paid";
const CONNECTOR_OPTIONS: Array<{ value: ConnectorType | "any"; label: string }> = [
  { value: "any", label: "Any plug" },
  { value: "nacs", label: "NACS / Tesla" },
  { value: "ccs", label: "CCS" },
  { value: "chademo", label: "CHAdeMO" },
  { value: "j1772", label: "J1772" },
];

export default function ChargingPage() {
  const { trip } = useTrip();
  const geo = useGeolocation();
  const [scope, setScope] = useState<Scope>("route");
  const [radius, setRadius] = useState(5);
  const [selected, setSelected] = useState<string | null>(null);
  const [walkRadius, setWalkRadius] = useState(0.5);
  const [walkCats, setWalkCats] = useState<CategoryId[]>(["food", "coffee", "shopping", "restrooms"]);
  // Filters. Speed is applied by the server (it changes what we fetch); the rest are applied here so the counts stay live.
  const [speed, setSpeed] = useState<Speed>("50");
  const [networks, setNetworks] = useState<string[]>([]);
  const [connector, setConnector] = useState<ConnectorType | "any">("any");
  const [cost, setCost] = useState<Cost>("any");

  const route = trip.route;
  const center: LatLng | null =
    scope === "me" ? geo.position : scope === "destination" ? (trip.destination ?? null) : null;
  const pointRadius = Math.max(radius, POINT_RADIUS);

  const areaKey =
    (scope === "route"
      ? route
        ? `r:${route.origin.lat},${route.origin.lng}>${route.destination.lat},${route.destination.lng}:${radius}`
        : ""
      : center
        ? `p:${center.lat},${center.lng}:${pointRadius}`
        : "") + (scope === "route" ? (route ? `|kw${SPEED_KW[speed]}` : "") : center ? `|kw${SPEED_KW[speed]}` : "");

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
        { minKw: SPEED_KW[speed] },
      ),
    NO_CHARGERS,
  );

  // Networks present in the fetched set, with counts, so the filter only offers real choices.
  const networkCounts = useMemo(() => {
    // (the Map component is imported on this page, so count with a plain object)
    const counts: Record<string, number> = {};
    for (const c of chargers.data) counts[c.network] = (counts[c.network] ?? 0) + 1;
    return Object.entries(counts)
      .map(([id, n]) => ({ id, label: chargers.data.find((c) => c.network === id)?.networkLabel ?? networkById(id).label, n }))
      .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  }, [chargers.data]);
  const visible = useMemo(
    () =>
      chargers.data.filter((c) => {
        if (networks.length && !networks.includes(c.network)) return false;
        if (connector !== "any" && !c.connectorTypes.includes(connector)) return false;
        if (cost === "free" && c.costTier !== "free") return false;
        if (cost === "paid" && c.costTier !== "paid") return false;
        return true;
      }),
    [chargers.data, networks, connector, cost],
  );
  const toggleNetwork = (id: string) => setNetworks((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

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
    () => [...visible.map(chargerMarker), ...nearby.data.map(placeMarker)],
    [visible, nearby.data],
  );

  const controls = (
    <div className="flex flex-col gap-3">
      <ActiveTripBanner />
      <div className="rounded-xl border border-border bg-surface p-3">
        <h1 className="font-semibold">⚡ EV charging stops</h1>
        <p className="mt-1 text-xs text-muted">
          Every network: Tesla, Electrify America, EVgo, ChargePoint, Rivian, IONNA and more. Filter by plug, speed and price, then see what you can walk to while the car charges.
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
      <Disclosure
        id="charging-filters"
        title="Charging filters"
        size="sm"
        summary={`${speed === "any" ? "Any speed" : speed === "l2" ? "Level 2+" : `${speed} kW+`} · ${connector === "any" ? "any plug" : connector.toUpperCase()} · ${cost === "any" ? "any price" : cost}${networks.length ? ` · ${networks.length} network${networks.length === 1 ? "" : "s"}` : ""}`}
        className="rounded-xl border border-border bg-surface p-3"
        bodyClassName="mt-2 flex flex-col gap-2"
      >
        <div className="hide-scrollbar overflow-x-auto">
          <Segmented
            label="Charging speed"
            value={speed}
            onChange={(v) => { setSpeed(v); setSelected(null); }}
            options={[
              { value: "any", label: "Any speed" },
              { value: "l2", label: "Level 2+" },
              { value: "50", label: "50 kW+" },
              { value: "150", label: "150 kW+" },
              { value: "250", label: "250 kW+" },
            ]}
          />
        </div>
        <div className="hide-scrollbar overflow-x-auto">
          <Segmented label="Plug type" value={connector} onChange={setConnector} options={CONNECTOR_OPTIONS} />
        </div>
        <div className="hide-scrollbar overflow-x-auto">
          <Segmented
            label="Price"
            value={cost}
            onChange={setCost}
            options={[
              { value: "any", label: "Any price" },
              { value: "free", label: "Free" },
              { value: "paid", label: "Paid" },
            ]}
          />
        </div>
        {networkCounts.length > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Networks</span>
              <button type="button" className="text-xs font-semibold text-blue hover:underline" onClick={() => setNetworks([])}>
                {networks.length ? "Show all" : "All shown"}
              </button>
            </div>
            <div className="mt-1 flex flex-wrap gap-1" role="group" aria-label="Networks">
              {networkCounts.map((n) => {
                const on = networks.length === 0 || networks.includes(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    aria-pressed={networks.includes(n.id)}
                    onClick={() => toggleNetwork(n.id)}
                    className={`rounded-full transition ${on ? "" : "opacity-40 grayscale"}`}
                    title={on ? `Hide ${n.label}` : `Show only ${n.label}`}
                  >
                    <NetworkBadge id={n.id} label={`${n.label} · ${n.n}`} />
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-muted">Tap a network to show only it; tap again to clear. Rates and fees come from the charging networks&apos; published data and may change.</p>
          </div>
        )}
      </Disclosure>
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
      <Disclosure
        id="charging-results"
        title={chargers.loading
            ? "Finding chargers…"
            : `${visible.length} charging ${visible.length === 1 ? "stop" : "stops"}${visible.length !== chargers.data.length ? ` of ${chargers.data.length}` : ""} ${
                scope === "route" ? `within ${radius} mi of your route` : `within ${pointRadius} mi`
              }`}
        summary="Results hidden"
        bodyClassName="mt-2 flex flex-col gap-3"
      >
      {chargers.done && chargers.data.length === 0 && !chargers.error && (
        <Empty>No chargers found in that range. Try a wider radius or “Any speed”.</Empty>
      )}
      {chargers.done && chargers.data.length > 0 && visible.length === 0 && (
        <Empty>Nothing matches those filters. Clear the network, plug or price filter.</Empty>
      )}
      <ul className="flex flex-col gap-2">
        {visible.map((c) => (
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
      </Disclosure>
      )}
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
