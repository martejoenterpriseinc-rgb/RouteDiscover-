import { fetchWithTimeout, getProviderConfig, withFallback } from "../config";
import { DEMO_GRAPH } from "../demo/data";
import { haversineMiles } from "../geo";
import type { GeoResult, LatLng, RouteResult } from "../types";

type OsrmResponse = {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }>;
};

async function liveRoute(origin: GeoResult, destination: GeoResult): Promise<Omit<RouteResult, "source">> {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const cfg = await getProviderConfig();
  const url = `${cfg.osrmUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as OsrmResponse;
  const r = json.routes?.[0];
  if (json.code !== "Ok" || !r) throw new Error(`no route (${json.code})`);
  return {
    geometry: r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanceMiles: r.distance / 1609.344,
    durationMinutes: r.duration / 60,
    origin,
    destination,
  };
}

function nearestNode(p: LatLng): string {
  let best = "";
  let bestD = Infinity;
  for (const [id, n] of DEMO_GRAPH.nodes) {
    const d = haversineMiles(p, n);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

/** Dijkstra over the small demo corridor graph. */
function demoPath(from: string, to: string): LatLng[] {
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const open = new Set<string>([from]);
  while (open.size) {
    let cur = "";
    let curD = Infinity;
    for (const id of open) {
      const d = dist.get(id) ?? Infinity;
      if (d < curD) {
        curD = d;
        cur = id;
      }
    }
    open.delete(cur);
    if (cur === to) break;
    const a = DEMO_GRAPH.nodes.get(cur)!;
    for (const nb of DEMO_GRAPH.edges.get(cur) ?? []) {
      const b = DEMO_GRAPH.nodes.get(nb)!;
      const nd = curD + haversineMiles(a, b);
      if (nd < (dist.get(nb) ?? Infinity)) {
        dist.set(nb, nd);
        prev.set(nb, cur);
        open.add(nb);
      }
    }
  }
  const path: LatLng[] = [];
  let cur: string | undefined = to;
  while (cur) {
    const n = DEMO_GRAPH.nodes.get(cur)!;
    path.unshift({ lat: n.lat, lng: n.lng });
    cur = prev.get(cur);
  }
  return path;
}

/** Add gentle intermediate points so the demo line reads like a road, not a ruler. */
function densify(points: LatLng[]): LatLng[] {
  const out: LatLng[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const steps = Math.max(2, Math.ceil(haversineMiles(a, b) / 8));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const wobble = Math.sin(t * Math.PI * 3 + i) * 0.015;
      out.push({ lat: a.lat + (b.lat - a.lat) * t + wobble, lng: a.lng + (b.lng - a.lng) * t });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function demoRoute(origin: GeoResult, destination: GeoResult): Omit<RouteResult, "source"> {
  const a = nearestNode(origin);
  const b = nearestNode(destination);
  const core = a === b ? [origin, destination] : demoPath(a, b);
  const pts = densify([{ lat: origin.lat, lng: origin.lng }, ...core, { lat: destination.lat, lng: destination.lng }]);
  let miles = 0;
  for (let i = 1; i < pts.length; i++) miles += haversineMiles(pts[i - 1], pts[i]);
  miles *= 1.08; // road factor over the smoothed line
  return {
    geometry: pts,
    distanceMiles: miles,
    durationMinutes: (miles / 62) * 60,
    origin,
    destination,
  };
}

export async function route(origin: GeoResult, destination: GeoResult) {
  return withFallback(
    "Routing",
    () => liveRoute(origin, destination),
    () => demoRoute(origin, destination),
  );
}
