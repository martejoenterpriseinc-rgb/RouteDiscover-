"use client";

import { useMemo, useState } from "react";
import { ActiveTripBanner, AddToTripButton } from "@/components/AddToTrip";
import { PlaceCard } from "@/components/Cards";
import { Disclosure } from "@/components/Disclosure";
import { Map } from "@/components/Map";
import { SplitLayout } from "@/components/SplitLayout";
import { Button, CategoryChips, Empty, ErrorNote, RadiusSlider, Segmented, SourceBanner } from "@/components/ui";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSearch } from "@/hooks/useSearch";
import { useTrailOverlay } from "@/hooks/useTrailOverlay";
import { useTrip } from "@/hooks/useTrip";
import { fetchPlaces } from "@/lib/client";
import { haversineMiles } from "@/lib/geo";
import { placeMarker } from "@/lib/markers";
import type { CategoryId, LatLng, Place } from "@/lib/types";

const NO_PLACES: Place[] = [];
/** Re-run the search once you've moved this far in follow mode. */
const REFRESH_MILES = 0.75;

export default function AroundMePage() {
  const { trip } = useTrip();
  const geo = useGeolocation();
  const [radius, setRadius] = useState(10);
  const [categories, setCategories] = useState<CategoryId[] | null>(null);
  const [openOnly, setOpenOnly] = useState<"all" | "open">("all");
  const [sort, setSort] = useState<"distance" | "rating">("distance");
  const [selected, setSelected] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<LatLng | null>(null);

  // Start from the traveller's saved categories; they can change them here.
  const cats = categories ?? trip.preferences?.categories ?? ["attractions", "food", "outdoors", "historic"];

  // Follow mode: move the search anchor once the device has travelled far enough (derived during render).
  const pos = geo.position;
  if (pos && (!anchor || haversineMiles(anchor, pos) >= REFRESH_MILES)) setAnchor(pos);

  const key = anchor ? `${anchor.lat.toFixed(3)},${anchor.lng.toFixed(3)}|${radius}|${cats.join(",")}` : "";
  const search = useSearch(key, () => fetchPlaces({ center: anchor!, radiusMiles: radius }, cats), NO_PLACES);

  const visible = useMemo(() => {
    let list = search.data;
    if (openOnly === "open") list = list.filter((p) => p.hours?.openNow === true);
    if (sort === "rating") list = [...list].sort((a, b) => (b.google?.rating ?? 0) - (a.google?.rating ?? 0) || (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));
    return list;
  }, [search.data, openOnly, sort]);
  const openCount = search.data.filter((p) => p.hours?.openNow === true).length;
  const trailLines = useTrailOverlay(visible.find((p) => p.id === selected));
  const markers = useMemo(() => visible.map(placeMarker), [visible]);

  const controls = (
    <div className="flex flex-col gap-3">
      <ActiveTripBanner />
      <div className="rounded-xl border border-border bg-surface p-3">
        <h1 className="font-semibold">📡 Around me</h1>
        <p className="mt-1 text-xs text-muted">Suggestions near where you are right now, from the categories you care about. Turn on Follow me and the list keeps up as you travel.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={() => geo.locate()} disabled={geo.loading} variant={pos ? "secondary" : "primary"}>
            {geo.loading ? "Locating…" : pos ? "📍 Update my location" : "📍 Suggest around me"}
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={geo.following} onChange={(e) => geo.setFollowing(e.target.checked)} />
            Follow me as I travel
          </label>
        </div>
        {geo.error && <p className="mt-2"><ErrorNote>{geo.error}</ErrorNote></p>}
        {pos && (
          <p className="mt-2 text-xs text-muted">
            You&apos;re at {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}{anchor && haversineMiles(anchor, pos) > 0.05 ? ` · ${haversineMiles(anchor, pos).toFixed(1)} mi from the last search` : ""}
            {geo.following ? " · following" : ""}
          </p>
        )}
      </div>
      {pos && (
        <div className="rounded-xl border border-border bg-surface p-3">
          <RadiusSlider label="Search within" value={radius} min={1} max={30} onChange={setRadius} />
        </div>
      )}
      <Disclosure id="around-categories" title="What are you in the mood for?" size="sm" summary={`${cats.length} categories`} className="rounded-xl border border-border bg-surface p-3" bodyClassName="mt-2">
        <CategoryChips value={cats} onChange={setCategories} />
        {trip.preferences && categories && (
          <button type="button" className="mt-2 text-xs font-semibold text-blue hover:underline" onClick={() => setCategories(null)}>Back to my saved categories</button>
        )}
      </Disclosure>
      {key && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
          <Segmented label="Open now" value={openOnly} onChange={setOpenOnly} options={[{ value: "all", label: "Everything" }, { value: "open", label: `Open now (${openCount})` }]} />
          <Segmented label="Sort" value={sort} onChange={setSort} options={[{ value: "distance", label: "Nearest" }, { value: "rating", label: "Top rated" }]} />
        </div>
      )}
      <SourceBanner source={search.source} notice={search.notice} />
    </div>
  );

  const list = !key ? (
    <Empty>Tap “Suggest around me” to use your location. Nothing is stored; it only picks the search area.</Empty>
  ) : (
    <Disclosure id="around-results" title={search.loading ? "Looking around…" : `${visible.length} ${openOnly === "open" ? "open " : ""}suggestions within ${radius} mi`} summary="Results hidden" bodyClassName="mt-2 flex flex-col gap-3">
      {search.error && <ErrorNote>{search.error}</ErrorNote>}
      {cats.length === 0 && <Empty>Pick at least one category.</Empty>}
      {search.done && visible.length === 0 && !search.error && cats.length > 0 && (
        <Empty>{openOnly === "open" ? "Nothing with known hours is open right now. Try “Everything” or a wider radius." : "Nothing found nearby. Widen the radius or add categories."}</Empty>
      )}
      <ul className="flex flex-col gap-2">
        {visible.map((p) => (
          <PlaceCard key={p.id} place={p} selected={selected === p.id} onClick={() => setSelected(p.id)} action={<AddToTripButton place={p} />} />
        ))}
      </ul>
    </Disclosure>
  );

  return (
    <SplitLayout
      controls={controls}
      list={list}
      map={<Map overlays={trailLines}
          markers={markers} selectedId={selected} onSelect={setSelected} here={pos} circle={anchor ? { center: anchor, radiusMiles: radius } : null} fitKey={key || "none"} />}
    />
  );
}
