"use client";

import { useEffect, useMemo, useState } from "react";
import { ActiveTripBanner } from "@/components/AddToTrip";
import { Disclosure } from "@/components/Disclosure";
import { EventCard } from "@/components/EventCard";
import { Map } from "@/components/Map";
import { PlaceInput } from "@/components/PlaceInput";
import { SplitLayout } from "@/components/SplitLayout";
import { TripPlanner } from "@/components/TripPlanner";
import { Button, Empty, ErrorNote, RadiusSlider, Segmented, SourceBanner } from "@/components/ui";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSearch } from "@/hooks/useSearch";
import { useTrip } from "@/hooks/useTrip";
import { fetchHappenings } from "@/lib/client";
import { EVENT_KINDS } from "@/lib/event-kinds";
import { eventMarker } from "@/lib/markers";
import type { EventKind, GeoResult, Happening, LatLng } from "@/lib/types";

type Scope = "route" | "me" | "destination";
type Window = "weekend" | "7" | "30" | "trip" | "custom";
const NONE: Happening[] = [];
const POINT_RADIUS = 40;

function windowDates(w: Window, custom: { from: string; to: string }, trip?: { startDate?: string; endDate?: string }): { from: string; to: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  if (w === "trip" && trip?.startDate && trip?.endDate) return { from: `${trip.startDate}T00:00:00Z`, to: `${trip.endDate}T23:59:59Z` };
  if (w === "custom" && custom.from && custom.to) return { from: `${custom.from}T00:00:00Z`, to: `${custom.to}T23:59:59Z` };
  if (w === "weekend") {
    const d = new Date(now);
    const dow = d.getDay();
    const toFri = (5 - dow + 7) % 7;
    const fri = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (dow === 6 || dow === 0 ? 0 : toFri));
    const start = dow === 6 || dow === 0 ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : fri;
    const sun = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (dow === 0 ? 0 : dow === 6 ? 1 : 2), 23, 59);
    return { from: iso(now), to: iso(sun) };
  }
  return { from: iso(now), to: iso(new Date(now.getTime() + Number(w) * 86400_000)) };
}

export default function EventsPage() {
  const { trip } = useTrip();
  const geo = useGeolocation();
  const [scope, setScope] = useState<Scope>("route");
  const [radius, setRadius] = useState(15);
  const [win, setWin] = useState<Window>("30");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [kinds, setKinds] = useState<EventKind[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const route = trip.route;
  const center: LatLng | null = scope === "me" ? geo.position : scope === "destination" ? (trip.destination ?? null) : null;
  const locate = geo.locate;
  useEffect(() => {
    if (scope === "me") locate();
  }, [scope, locate]);
  const dates = windowDates(win, custom, trip.activeTrip);
  const pointRadius = Math.max(radius, POINT_RADIUS);
  const areaKey =
    scope === "route" ? (route ? `r:${route.origin.lat},${route.origin.lng}>${route.destination.lat},${route.destination.lng}:${radius}` : "") : center ? `p:${center.lat},${center.lng}:${pointRadius}` : "";
  const key = areaKey ? `${areaKey}|${dates.from.slice(0, 13)}|${dates.to.slice(0, 13)}` : "";
  const events = useSearch(key, () => fetchHappenings(scope === "route" && route ? { route: route.geometry, radiusMiles: radius } : { center: center!, radiusMiles: pointRadius }, { from: dates.from, to: dates.to }), NONE);

  const counts = useMemo(() => {
    const c: Partial<Record<EventKind, number>> = {};
    for (const e of events.data) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [events.data]);
  const visible = useMemo(() => (kinds.length ? events.data.filter((e) => kinds.includes(e.kind)) : events.data), [events.data, kinds]);
  const markers = useMemo(() => visible.map(eventMarker), [visible]);

  const controls = (
    <div className="flex flex-col gap-3">
      <ActiveTripBanner />
      <div className="rounded-xl border border-border bg-surface p-3">
        <h1 className="font-semibold">🎟️ Events & happenings</h1>
        <p className="mt-1 text-xs text-muted">Fairs, festivals, concerts, car shows, swap meets, flea markets, the big multi-state yard sales, haunted houses and holiday lights, along your route or wherever you are. Times are shown in the event&apos;s own time zone.</p>
        <div className="mt-3">
          <Segmented label="Where" value={scope} onChange={(s) => { setScope(s); setSelected(null); }} options={[{ value: "route", label: "Along route" }, { value: "me", label: "Near me" }, { value: "destination", label: "At destination" }]} />
        </div>
      </div>
      {scope === "route" && <TripPlanner compact />}
      {scope === "me" && !geo.position && (
        <div className="rounded-xl border border-border bg-surface p-3 text-sm">{geo.loading ? "Getting your location…" : (geo.error ?? "Location needed.")} {!geo.loading && <Button variant="ghost" onClick={() => geo.locate()}>Try again</Button>}</div>
      )}
      {scope === "destination" && !trip.destination && <div className="rounded-xl border border-border bg-surface p-3 text-sm text-muted">Set a destination on the Route tab first.</div>}
      {scope === "route" && route && (
        <div className="rounded-xl border border-border bg-surface p-3"><RadiusSlider label="Miles off route" value={radius} min={1} max={50} onChange={setRadius} /></div>
      )}
      <Disclosure id="events-when" title="When" size="sm" summary={win === "custom" ? `${custom.from || "?"} → ${custom.to || "?"}` : win === "trip" ? "During my trip" : win === "weekend" ? "This weekend" : `Next ${win} days`} className="rounded-xl border border-border bg-surface p-3" bodyClassName="mt-2 flex flex-col gap-2">
        <div className="hide-scrollbar overflow-x-auto">
          <Segmented
            label="Time window"
            value={win}
            onChange={setWin}
            options={[
              { value: "weekend", label: "This weekend" },
              { value: "7", label: "Next 7 days" },
              { value: "30", label: "Next 30 days" },
              ...(trip.activeTrip?.startDate ? [{ value: "trip" as const, label: "During my trip" }] : []),
              { value: "custom", label: "Pick dates" },
            ]}
          />
        </div>
        {win === "custom" && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input type="date" aria-label="From" className="rounded-lg border border-border bg-surface px-2 py-1" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
            <span className="text-muted">to</span>
            <input type="date" aria-label="To" className="rounded-lg border border-border bg-surface px-2 py-1" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </div>
        )}
      </Disclosure>
      <Disclosure id="events-kinds" title="What kind" size="sm" summary={kinds.length ? `${kinds.length} selected` : "All kinds"} className="rounded-xl border border-border bg-surface p-3" bodyClassName="mt-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Event kinds">
          {EVENT_KINDS.map((k) => {
            const on = kinds.includes(k.id);
            return (
              <button key={k.id} type="button" aria-pressed={on} onClick={() => setKinds(on ? kinds.filter((x) => x !== k.id) : [...kinds, k.id])} className={`rounded-full border px-3 py-1 text-sm font-medium ${on ? "border-blue bg-blue text-white" : "border-border bg-surface hover:border-blue"}`}>
                <span aria-hidden className="mr-1">{k.emoji}</span>{k.label}{counts[k.id] ? ` · ${counts[k.id]}` : ""}
              </button>
            );
          })}
          {kinds.length > 0 && <button type="button" className="text-xs font-semibold text-blue hover:underline" onClick={() => setKinds([])}>All kinds</button>}
        </div>
      </Disclosure>
      <SubmitEvent />
      <SourceBanner source={events.source} notice={events.notice} />
    </div>
  );

  const list = (
    <>
      {events.error && <ErrorNote>{events.error}</ErrorNote>}
      {key && (
        <Disclosure id="events-results" title={events.loading ? "Finding events…" : `${visible.length} ${visible.length === 1 ? "event" : "events"} ${scope === "route" ? `within ${radius} mi of your route` : `within ${pointRadius} mi`}`} summary="Results hidden" bodyClassName="mt-2 flex flex-col gap-3">
          {events.done && visible.length === 0 && !events.error && <Empty>Nothing in that window. Try a longer window, a wider radius, or add an event you know about.</Empty>}
          <ul className="flex flex-col gap-2">
            {visible.map((e) => (
              <EventCard key={e.id} event={e} selected={selected === e.id} onClick={() => setSelected(e.id)} />
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
      map={<Map route={scope === "route" ? route?.geometry : undefined} markers={markers} selectedId={selected} onSelect={setSelected} here={geo.position} circle={center ? { center, radiusMiles: pointRadius } : null} fitKey={key || "none"} />}
    />
  );
}

function SubmitEvent() {
  const [where, setWhere] = useState<GeoResult | undefined>();
  const [f, setF] = useState({ title: "", kind: "yard_sale" as EventKind, venue: "", start: "", startTime: "09:00", end: "", endTime: "17:00", allDay: false, url: "", price: "", description: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none ring-blue/40 focus:ring-2";
  return (
    <Disclosure id="events-submit" title="Know an event? Add it" size="sm" defaultOpen={false} summary="Yard sales, cruise-ins, fairs, markets…" className="rounded-xl border border-dashed border-border bg-surface p-3" bodyClassName="mt-2">
      <form
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          setMsg(null);
          try {
            if (!where) throw new Error("Pick where it happens.");
            const startsAt = `${f.start}T${f.allDay ? "00:00" : f.startTime}:00`;
            const endsAt = `${f.end || f.start}T${f.allDay ? "23:59" : f.endTime}:00`;
            const res = await fetch("/api/happenings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, lat: where.lat, lng: where.lng, address: where.label, startsAt, endsAt }) });
            const j = (await res.json()) as { error?: string; status?: string };
            if (!res.ok) throw new Error(j.error || "Could not save.");
            setMsg(j.status === "approved" ? "Added and live." : "Thanks! It will show up once the RouteDiscover team approves it.");
            setF({ ...f, title: "", description: "", url: "", price: "" });
          } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Could not save.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input className={field} placeholder="Event name" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
        <select className={field} aria-label="Kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as EventKind })}>
          {EVENT_KINDS.map((k) => (
            <option key={k.id} value={k.id}>{k.emoji} {k.label}</option>
          ))}
        </select>
        <PlaceInput label="Where" placeholder="Address or town" value={where} onChange={setWhere} />
        <input className={field} placeholder="Venue or details (optional)" value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label>Starts<input type="date" className={field} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} required /></label>
          <label>Ends<input type="date" className={field} value={f.end} min={f.start} onChange={(e) => setF({ ...f, end: e.target.value })} /></label>
          {!f.allDay && <label>From<input type="time" className={field} value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} /></label>}
          {!f.allDay && <label>To<input type="time" className={field} value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} /></label>}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={f.allDay} onChange={(e) => setF({ ...f, allDay: e.target.checked })} />All day</label>
        <div className="grid grid-cols-2 gap-2">
          <input className={field} placeholder="Price (e.g. Free, $10)" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          <input className={field} placeholder="Website (optional)" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
        </div>
        <textarea className={field} rows={2} placeholder="Anything travelers should know" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        {err && <ErrorNote>{err}</ErrorNote>}
        {msg && <p className="text-sm font-semibold text-green">{msg}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Add event"}</Button>
      </form>
    </Disclosure>
  );
}
