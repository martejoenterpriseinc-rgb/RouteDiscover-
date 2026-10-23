"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Wordmark } from "@/components/AppNav";
import { PlaceCard } from "@/components/Cards";
import { Map } from "@/components/Map";
import { SplitLayout } from "@/components/SplitLayout";
import { TripPlanner } from "@/components/TripPlanner";
import { Button, CategoryChips, Empty, ErrorNote, SourceBanner } from "@/components/ui";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSearch } from "@/hooks/useSearch";
import { useTrip } from "@/hooks/useTrip";
import { DEFAULT_ROUTE_CATEGORIES } from "@/lib/categories";
import { fetchPlaces } from "@/lib/client";
import { distanceToRoute, indexRoute } from "@/lib/geo";
import { placeMarker } from "@/lib/markers";
import type { CategoryId, Place } from "@/lib/types";

const NO_PLACES: Place[] = [];

export default function RoutePage() {
  const { trip } = useTrip();
  const geo = useGeolocation();
  const [categories, setCategories] = useState<CategoryId[]>(DEFAULT_ROUTE_CATEGORIES);
  const [selected, setSelected] = useState<string | null>(null);
  const [aheadOnly, setAheadOnly] = useState(false);

  const route = trip.route;
  const routeKey = route ? `${route.origin.lat},${route.origin.lng}>${route.destination.lat},${route.destination.lng}` : "";
  const searchKey = route && categories.length ? `${routeKey}|${trip.radiusMiles}|${categories.join(",")}` : "";

  const search = useSearch(
    searchKey,
    () => fetchPlaces({ route: route!.geometry, radiusMiles: trip.radiusMiles }, categories),
    NO_PLACES,
  );

  const myMile = useMemo(() => {
    if (!route || !geo.position) return null;
    const d = distanceToRoute(geo.position, indexRoute(route.geometry));
    return d.detourMiles <= 25 ? d.alongMiles : null;
  }, [route, geo.position]);

  const visible = useMemo(() => {
    if (!aheadOnly || myMile == null) return search.data;
    return search.data.filter((p) => (p.alongMiles ?? 0) >= myMile - 1);
  }, [search.data, aheadOnly, myMile]);

  const markers = useMemo(() => visible.map(placeMarker), [visible]);

  const controls = (
    <>
      {!route && (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-gradient-to-br from-cream to-surface p-4 text-center">
          <Image src="/brand/routediscover-logo.png" alt="RouteDiscover" width={160} height={160} priority className="h-28 w-28" />
          <h1 className="text-lg">
            <Wordmark className="text-2xl" />
          </h1>
          <p className="text-sm text-muted">
            Plan a drive, pick how many miles off the highway you&apos;re willing to go, and see everything
            worth stopping for along the way.
          </p>
        </div>
      )}
      <TripPlanner compact />
      {route && (
        <>
          <SourceBanner source={search.source} notice={search.notice} />
          <CategoryChips value={categories} onChange={setCategories} />
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
        </>
      )}
    </>
  );

  const list = !route ? null : (
    <>
      {search.error && <ErrorNote>{search.error}</ErrorNote>}
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">
          {search.loading ? "Searching along your route…" : `${visible.length} stops within ${trip.radiusMiles} mi`}
        </h2>
        <span className="text-xs text-muted">sorted by mile marker</span>
      </div>
      {categories.length === 0 && <Empty>Pick at least one category.</Empty>}
      {search.done && visible.length === 0 && !search.error && (
        <Empty>Nothing found for those categories. Try widening the miles-off-route slider or adding categories.</Empty>
      )}
      <ul className="flex flex-col gap-2">
        {visible.map((p) => (
          <PlaceCard key={p.id} place={p} selected={selected === p.id} onClick={() => setSelected(p.id)} />
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
