"use client";

import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Circle, useMap } from "react-leaflet";
import { bounds as boundsOf } from "@/lib/geo";
import { loadGoogleMaps, useMapConfig } from "@/lib/map-config";
import type { LatLng } from "@/lib/types";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  emoji: string;
  color: string;
  sub?: string;
};

export type MapViewProps = {
  route?: LatLng[];
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Point of interest to center on (e.g. user location) */
  here?: LatLng | null;
  /** Draw a radius circle (miles) around `center`. */
  circle?: { center: LatLng; radiusMiles: number } | null;
  /** Changing this value re-fits the map to its content. */
  fitKey: string;
  /** Extra lines to draw, e.g. a hiking trail's geometry. */
  overlays?: LatLng[][];
};

const TILE_URL =
  process.env.NEXT_PUBLIC_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Base map: Google Maps when the owner has entered a browser key (drawn by
 * Leaflet.GoogleMutant), otherwise the configured raster tiles.
 */
function BaseLayer() {
  const cfg = useMapConfig();
  const map = useMap();
  const [googleReady, setGoogleReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (!cfg || cfg.provider !== "google" || !cfg.googleKey) return;
    let cancelled = false;
    loadGoogleMaps(cfg.googleKey).then((ok) => !cancelled && setGoogleReady(ok));
    return () => {
      cancelled = true;
    };
  }, [cfg]);

  useEffect(() => {
    if (!googleReady) return;
    let layer: L.GridLayer | null = null;
    let cancelled = false;
    (async () => {
      try {
        // The GoogleMutant plugin registers itself on the global Leaflet object.
        (window as unknown as { L: typeof L }).L = L;
        await import("leaflet.gridlayer.googlemutant");
        if (cancelled) return;
        layer = (L.gridLayer as unknown as { googleMutant: (o: { type: string }) => L.GridLayer }).googleMutant({ type: "roadmap" });
        layer.addTo(map);
      } catch (err) {
        console.warn("[routediscover] Google map layer unavailable, using tiles:", err);
        setGoogleReady(false);
      }
    })();
    return () => {
      cancelled = true;
      layer?.remove();
    };
  }, [googleReady, map]);

  if (!cfg) return null;
  if (cfg.provider === "google" && cfg.googleKey && googleReady !== false) return null;
  return <TileLayer url={cfg.tileUrl || TILE_URL} attribution={cfg.attribution || TILE_ATTRIBUTION} />;
}

function icon(m: MapMarker, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="rd-marker${selected ? " selected" : ""}" style="background:${m.color}"><span>${m.emoji}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

const hereIcon = L.divIcon({
  className: "",
  html: `<div class="rd-dot" style="background:#1f8ae6"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function fit(map: L.Map, pts: LatLng[]) {
  const b = boundsOf(pts);
  if (!b) return;
  if (pts.length === 1) {
    map.setView([pts[0].lat, pts[0].lng], 12, { animate: false });
    return;
  }
  map.fitBounds(
    [
      [b[0].lat, b[0].lng],
      [b[1].lat, b[1].lng],
    ],
    { padding: [30, 30], animate: false },
  );
}

/**
 * Fit the map to its content when the content changes, and again whenever the
 * container is resized or first becomes visible (Leaflet measures itself on
 * mount, so a map created inside a hidden panel starts out with no size).
 */
function FitBounds({ pts, fitKey }: { pts: LatLng[]; fitKey: string }) {
  const map = useMap();
  const latest = useRef(pts);
  useEffect(() => {
    latest.current = pts;
  });

  useEffect(() => {
    fit(map, latest.current);
  }, [fitKey, map]);

  useEffect(() => {
    const el = map.getContainer();
    let hadSize = el.clientWidth > 0 && el.clientHeight > 0;
    const ro = new ResizeObserver(() => {
      const hasSize = el.clientWidth > 0 && el.clientHeight > 0;
      if (!hasSize) return;
      map.invalidateSize({ animate: false });
      if (!hadSize) fit(map, latest.current);
      hadSize = true;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function FlyTo({ target }: { target: LatLng | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
  }, [target, map]);
  return null;
}

/** Abort any running pan/zoom animation before the map is torn down (otherwise Leaflet throws on the removed panes). */
function StopOnUnmount() {
  const map = useMap();
  useEffect(() => {
    return () => {
      try {
        map.stop();
        // A CSS zoom transition can finish after the panes are gone; clearing the
        // flag makes Leaflet ignore that late transitionend event.
        (map as unknown as { _animatingZoom?: boolean })._animatingZoom = false;
      } catch {
        /* already removed */
      }
    };
  }, [map]);
  return null;
}

export default function MapView({ route, markers, selectedId, onSelect, here, circle, fitKey, overlays }: MapViewProps) {
  const fitPts = useMemo(() => {
    const pts: LatLng[] = [];
    if (route?.length) pts.push(...route);
    else pts.push(...markers);
    if (!pts.length && here) pts.push(here);
    if (!pts.length && circle) pts.push(circle.center);
    return pts;
  }, [route, markers, here, circle]);

  const selected = markers.find((m) => m.id === selectedId) ?? null;
  const center: [number, number] = fitPts[0] ? [fitPts[0].lat, fitPts[0].lng] : [39.5, -98.35];

  return (
    <MapContainer center={center} zoom={fitPts[0] ? 10 : 4} className="h-full w-full" scrollWheelZoom>
      <BaseLayer />
      <StopOnUnmount />
      <FitBounds pts={fitPts} fitKey={fitKey} />
      <FlyTo target={selected} />
      {route && route.length > 1 && (
        <>
          <Polyline positions={route.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#ffffff", weight: 8, opacity: 0.9 }} />
          <Polyline positions={route.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#1f8ae6", weight: 5 }} />
        </>
      )}
      {(overlays ?? []).map((line, i) =>
        line.length > 1 ? (
          <Polyline key={`ov-${i}`} positions={line.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#33691e", weight: 4, dashArray: "6 6", opacity: 0.9 }} />
        ) : null,
      )}
      {circle && (
        <Circle
          center={[circle.center.lat, circle.center.lng]}
          radius={circle.radiusMiles * 1609.344}
          pathOptions={{ color: "#f7941d", fillColor: "#f7941d", fillOpacity: 0.08, weight: 2, dashArray: "6 6" }}
        />
      )}
      {here && <Marker position={[here.lat, here.lng]} icon={hereIcon} zIndexOffset={500} />}
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={icon(m, m.id === selectedId)}
          zIndexOffset={m.id === selectedId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect?.(m.id) }}
        >
          <Popup>
            <strong>{m.label}</strong>
            {m.sub && (
              <>
                <br />
                <span style={{ color: "#5b6478" }}>{m.sub}</span>
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
