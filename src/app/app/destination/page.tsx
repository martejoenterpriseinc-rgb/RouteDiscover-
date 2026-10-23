"use client";

import { useMemo, useState } from "react";
import { ActiveTripBanner, AddToTripButton } from "@/components/AddToTrip";
import { Disclosure } from "@/components/Disclosure";
import { PlaceCard } from "@/components/Cards";
import { Map } from "@/components/Map";
import { PlaceInput } from "@/components/PlaceInput";
import { SplitLayout } from "@/components/SplitLayout";
import { Button, CategoryChips, Empty, ErrorNote, RadiusSlider, SourceBanner } from "@/components/ui";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSearch } from "@/hooks/useSearch";
import { useTrailOverlay } from "@/hooks/useTrailOverlay";
import { useTrip } from "@/hooks/useTrip";
import { DEFAULT_ROUTE_CATEGORIES } from "@/lib/categories";
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

  const search = useSearch(searchKey, () => fetchPlaces({ center: where!, radiusMiles: radius }, categories), NO_PLACES);

  function submit() {
    if (!where) return setFormError("Pick a destination first.");
    if (!categories.length) return setFormError("Pick at least one category.");
    setFormError(null);
    setSearchKey(`${where.lat},${where.lng}|${radius}|${categories.join(",")}`);
  }

  const trailLines = useTrailOverlay(search.data.find((p) => p.id === selected));
  const markers = useMemo(() => search.data.map(placeMarker), [search.data]);

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
          <CategoryChips value={categories} onChange={setCategories} />
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
          <Disclosure id="destination-results" title={search.loading ? "Searching…" : `${search.data.length} places within ${radius} mi of ${where?.label ?? "there"}`} summary="Results hidden" bodyClassName="mt-2 flex flex-col gap-3">
            {search.error && <ErrorNote>{search.error}</ErrorNote>}
            {search.done && search.data.length === 0 && !search.error && (
              <Empty>No matches. Widen the radius or add categories.</Empty>
            )}
            <ul className="flex flex-col gap-2">
              {search.data.map((p) => (
                <PlaceCard key={p.id} place={p} selected={selected === p.id} onClick={() => setSelected(p.id)} action={<AddToTripButton place={p} />} />
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
