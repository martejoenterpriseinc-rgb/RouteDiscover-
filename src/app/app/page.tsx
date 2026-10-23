"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SendToPhone } from "@/components/SendToPhone";
import { fetchRoute } from "@/lib/client";
import Link from "next/link";
import { ActiveTripBanner, AddToTripButton } from "@/components/AddToTrip";
import { Wordmark } from "@/components/AppNav";
import { Disclosure } from "@/components/Disclosure";
import { KpiStripLive } from "@/components/KpiStrip";
import { PlaceCard } from "@/components/Cards";
import { Map } from "@/components/Map";
import { SplitLayout } from "@/components/SplitLayout";
import { TripPlanner } from "@/components/TripPlanner";
import { Button, CategoryChecklist, Empty, ErrorNote, SourceBanner } from "@/components/ui";
import { DriveStopsPanel, StopToggle } from "@/components/DriveStops";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSearch } from "@/hooks/useSearch";
import { useTrailOverlay } from "@/hooks/useTrailOverlay";
import { useTrip } from "@/hooks/useTrip";
import { ALL_CATEGORY_IDS, CATEGORIES, DEFAULT_ROUTE_CATEGORIES } from "@/lib/categories";
import { fetchPlaces } from "@/lib/client";
import { distanceToRoute, indexRoute } from "@/lib/geo";
import { placeMarker, stopMarker } from "@/lib/markers";
import type { CategoryId, Place } from "@/lib/types";

const NO_PLACES: Place[] = [];
const NO_STOPS: Place[] = [];

function RoutePageInner() {
  const { trip, update } = useTrip();
  const params = useSearchParams();
  const geo = useGeolocation();
  const [categories, setCategories] = useState<CategoryId[]>(DEFAULT_ROUTE_CATEGORIES);
  // Seed the category chips from saved preferences once they arrive.
  const prefCats = trip.preferences?.categories?.join(",") ?? "";
  const [seededFrom, setSeededFrom] = useState("");
  if (prefCats && seededFrom !== prefCats) {
    setSeededFrom(prefCats);
    setCategories(trip.preferences!.categories);
  }
  const [selected, setSelected] = useState<string | null>(null);
  const [aheadOnly, setAheadOnly] = useState(false);

  const route = trip.route;
  const routeKey = route ? `${route.origin.lat},${route.origin.lng}>${route.destination.lat},${route.destination.lng}` : "";

  // A link like /app?o=41.88,-87.63&d=40.04,-76.31&r=10 plans the route on open (used by "send to phone").
  const linkKey = `${params.get("o") ?? ""}|${params.get("d") ?? ""}|${params.get("r") ?? ""}`;
  useEffect(() => {
    const [o, d, r] = linkKey.split("|");
    const parse = (v: string) => {
      const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(v);
      return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
    };
    const op = parse(o);
    const dp = parse(d);
    if (!op || !dp) return;
    let cancelled = false;
    const origin = { label: params.get("ol") || `${op.lat.toFixed(3)}, ${op.lng.toFixed(3)}`, ...op };
    const destination = { label: params.get("dl") || `${dp.lat.toFixed(3)}, ${dp.lng.toFixed(3)}`, ...dp };
    fetchRoute(origin, destination)
      .then((res) => {
        if (cancelled) return;
        update({ origin, destination, radiusMiles: Number(r) || trip.radiusMiles, radiusTouched: !!r, route: { ...res.data, source: res.source } });
        window.history.replaceState(null, "", "/app");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkKey]);

  const routeLink = route
    ? `/app?o=${route.origin.lat.toFixed(5)},${route.origin.lng.toFixed(5)}&d=${route.destination.lat.toFixed(5)},${route.destination.lng.toFixed(5)}&r=${trip.radiusMiles}&ol=${encodeURIComponent(route.origin.label)}&dl=${encodeURIComponent(route.destination.label)}`
    : null;
  // One search for every category along the corridor; the checklist then filters instantly
  // and shows how many of each kind were found. Stops added to the drive don't re-run it.
  // (The key leaves out the geometry, so re-planning through stops keeps the same results.)
  const searchKey = route ? `${routeKey}|${trip.radiusMiles}` : "";

  const search = useSearch(
    searchKey,
    () => fetchPlaces({ route: route!.geometry, radiusMiles: trip.radiusMiles }, ALL_CATEGORY_IDS),
    NO_PLACES,
  );
  const counts = useMemo(() => {
    const out: Partial<Record<CategoryId, number>> = {};
    for (const p of search.data) out[p.category] = (out[p.category] ?? 0) + 1;
    return out;
  }, [search.data]);

  const myMile = useMemo(() => {
    if (!route || !geo.position) return null;
    const d = distanceToRoute(geo.position, indexRoute(route.geometry));
    return d.detourMiles <= 25 ? d.alongMiles : null;
  }, [route, geo.position]);

  const visible = useMemo(() => {
    const picked = search.data.filter((p) => categories.includes(p.category));
    if (!aheadOnly || myMile == null) return picked;
    return picked.filter((p) => (p.alongMiles ?? 0) >= myMile - 1);
  }, [search.data, categories, aheadOnly, myMile]);

  const stops = trip.stops ?? NO_STOPS;
  const trailLines = useTrailOverlay(visible.find((p) => p.id === selected));
  const markers = useMemo(() => [...visible.filter((p) => !stops.some((s) => s.id === p.id)).map(placeMarker), ...stops.map((s, i) => stopMarker(s, i + 1))], [visible, stops]);

  const controls = (
    <>
      {!route && (
        <Disclosure id="route-welcome" title="Plan a drive" summary="Pick a start and destination below" className="rounded-xl bg-gradient-to-br from-cream to-surface p-4" bodyClassName="mt-2 flex flex-col items-center gap-2 text-center">
          <span className="brand-plate"><Image src="/brand/routediscover-logo.png" alt="RouteDiscover" width={160} height={160} priority className="h-28 w-28" /></span>
          <h1 className="text-lg">
            <Wordmark className="text-2xl" />
          </h1>
          <p className="text-sm text-muted">
            Plan a drive, pick how many miles off the highway you&apos;re willing to go, and see everything
            worth stopping for along the way.
          </p>
          <div className="mt-2 w-full">
            <KpiStripLive compact />
          </div>
        </Disclosure>
      )}
      <ActiveTripBanner />
      <TripPlanner compact />
      {route && <DriveStopsPanel />}
      {route && !trip.activeTrip && (
        <Link href="/app/trips/new" className="text-center text-sm font-semibold text-blue hover:underline">
          🗓️ Save this route as a trip
        </Link>
      )}
      {route && routeLink && <SendToPhone path={routeLink} title={`${route.origin.label} → ${route.destination.label}`} compact />}
      {route && (
        <Disclosure id="route-filters" title="What to look for" summary={`${categories.length} of ${CATEGORIES.length} categories · ${visible.length} stops${aheadOnly ? " · ahead of me" : ""}`} className="rounded-xl border border-border bg-surface p-3" bodyClassName="mt-2 flex flex-col gap-2">
          <SourceBanner source={search.source} notice={search.notice} />
          <p className="text-xs text-muted">Tick the kinds of places you want. The number shows how many of each are within {trip.radiusMiles} mi of this drive.</p>
          <CategoryChecklist value={categories} onChange={setCategories} counts={search.done && !search.error ? counts : undefined} countsLabel="along the route" />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Button
              variant={aheadOnly ? "primary" : "secondary"}
              onClick={async () => {
                if (!aheadOnly && !geo.position) await geo.locate();
                setAheadOnly((v) => !v);
              }}
              disabled={geo.loading}
            >
              🧭 {aheadOnly ? "Showing what's ahead" : "Only show what's ahead of me"}
            </Button>
            {aheadOnly && myMile == null && !geo.loading && (
              <span className="text-xs text-muted">{geo.error ?? "You don't seem to be on this route yet."}</span>
            )}
            {myMile != null && <span className="text-xs text-muted">You&apos;re near mile {Math.round(myMile)}</span>}
          </div>
        </Disclosure>
      )}
    </>
  );

  const list = !route ? null : (
    <Disclosure
      id="route-results"
      title={search.loading ? "Searching along your route…" : `${visible.length} stops within ${trip.radiusMiles} mi`}
      summary="Results hidden"
      aside={<span className="text-xs text-muted">by mile · tick a box to add it to the drive</span>}
      bodyClassName="mt-2 flex flex-col gap-3"
    >
      {search.error && <ErrorNote>{search.error}</ErrorNote>}
      {categories.length === 0 && <Empty>Pick at least one category.</Empty>}
      {search.done && visible.length === 0 && !search.error && (
        <Empty>Nothing found for those categories. Try widening the miles-off-route slider or adding categories.</Empty>
      )}
      <ul className="flex flex-col gap-2">
        {visible.map((p) => (
          <PlaceCard key={p.id} place={p} selected={selected === p.id} onClick={() => setSelected(p.id)} action={<span className="flex flex-wrap items-center justify-end gap-1"><StopToggle place={p} /><AddToTripButton place={p} /></span>} />
        ))}
      </ul>
    </Disclosure>
  );

  return (
    <SplitLayout
      controls={controls}
      list={list}
      map={
        <Map
          overlays={trailLines}
          route={route?.geometry}
          markers={markers}
          selectedId={selected}
          onSelect={setSelected}
          here={geo.position}
          fitKey={routeKey || "none"}
        />
      }
    />
  );
}

export default function RoutePage() {
  return (
    <Suspense>
      <RoutePageInner />
    </Suspense>
  );
}
