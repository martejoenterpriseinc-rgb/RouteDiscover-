"use client";

import { useMemo, useState } from "react";
import { ActiveTripBanner, AddToTripButton } from "@/components/AddToTrip";
import { Disclosure } from "@/components/Disclosure";
import { PlaceCard } from "@/components/Cards";
import { Map } from "@/components/Map";
import { PlaceInput } from "@/components/PlaceInput";
import { SplitLayout } from "@/components/SplitLayout";
import { Button, CategoryChecklist, Empty, ErrorNote, RadiusSlider, SourceBanner } from "@/components/ui";
import { StopToggle } from "@/components/DriveStops";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSearch } from "@/hooks/useSearch";
import { useTrailOverlay } from "@/hooks/useTrailOverlay";
import { useTrip } from "@/hooks/useTrip";
import { ALL_CATEGORY_IDS, DEFAULT_ROUTE_CATEGORIES } from "@/lib/categories";
import { fetchPlaces } from "@/lib/client";
import { placeMarker } from "@/lib/markers";
import type { CategoryId, GeoResult, Place } from "@/lib/types";

const NO_PLACES: Place[] = [];

export default function DestinationPage() {
  const { trip } = useTrip();
  const geo = useGeolocation();
  // null = untouched, so the trip's destination is used until the user edits the field.
  const [whereOverride, setWhereOverride] = useState<GeoResult | undefined | null>(null);
  const where = whereOverride === null ? trip.destination : whereOverride;
  const [radius, setRadius] = useState(10);
  const [categories, setCategories] = useState<CategoryId[]>(DEFAULT_ROUTE_CATEGORIES);
  const [selected, setSelected] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchKey, setSearchKey] = useState("");

  // Every category is fetched once; the checklist filters instantly and shows counts.
  const search = useSearch(searchKey, () => fetchPlaces({ center: where!, radiusMiles: radius }, ALL_CATEGORY_IDS), NO_PLACES);
  const counts = useMemo(() => {
    const out: Partial<Record<CategoryId, number>> = {};
    for (const p of search.data) out[p.category] = (out[p.category] ?? 0) + 1;
    return out;
  }, [search.data]);
  const visible = useMemo(() => search.data.filter((p) => categories.includes(p.category)), [search.data, categories]);

  function submit() {
    if (!where) return setFormError("Pick a destination first.");
    setFormError(null);
    setSearchKey(`${where.lat},${where.lng}|${radius}`);
  }

  const trailLines = useTrailOverlay(visible.find((p) => p.id === selected));
  const markers = useMemo(() => visible.map(placeMarker), [visible]);

  return (
    <SplitLayout
      controls={
        <>
        <ActiveTripBanner />
        <form
          className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <h1 className="font-semibold">📍 Destination lookup</h1>
          <PlaceInput
            label="Destination"
            placeholder="Lancaster, PA"
            value={where}
            onChange={setWhereOverride}
            onLocate={async () => {
              const p = await geo.locate();
              return p ? { label: "My location", lat: p.lat, lng: p.lng } : null;
            }}
            locating={geo.loading}
          />
          <RadiusSlider value={radius} min={1} max={30} onChange={setRadius} />
          <CategoryChecklist value={categories} onChange={setCategories} counts={search.done && !search.error ? counts : undefined} countsLabel="nearby" />
          {formError && <ErrorNote>{formError}</ErrorNote>}
          <Button type="submit" disabled={search.loading}>
            {search.loading ? "Searching…" : "Find things nearby"}
          </Button>
          <SourceBanner source={search.source} notice={search.notice} />
        </form>
        </>
      }
      list={
        searchKey ? (
          <Disclosure id="destination-results" title={search.loading ? "Searching…" : `${visible.length} places within ${radius} mi of ${where?.label ?? "there"}`} summary="Results hidden" bodyClassName="mt-2 flex flex-col gap-3">
            {search.error && <ErrorNote>{search.error}</ErrorNote>}
            {categories.length === 0 && <Empty>Tick at least one category.</Empty>}
            {search.done && visible.length === 0 && !search.error && categories.length > 0 && (
              <Empty>No matches. Widen the radius or tick more categories.</Empty>
            )}
            <ul className="flex flex-col gap-2">
              {visible.map((p) => (
                <PlaceCard key={p.id} place={p} selected={selected === p.id} onClick={() => setSelected(p.id)} action={<span className="flex flex-wrap items-center justify-end gap-1"><StopToggle place={p} /><AddToTripButton place={p} /></span>} />
              ))}
            </ul>
          </Disclosure>
        ) : null
      }
      map={
        <Map
          overlays={trailLines}
          markers={markers}
          selectedId={selected}
          onSelect={setSelected}
          circle={where ? { center: where, radiusMiles: radius } : null}
          fitKey={searchKey || (where ? `${where.lat},${where.lng}` : "none")}
        />
      }
    />
  );
}
