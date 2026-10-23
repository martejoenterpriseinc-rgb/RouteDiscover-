import type { LatLng } from "./types";

export const EARTH_RADIUS_MILES = 3958.7613;
export const METERS_PER_MILE = 1609.344;

const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in miles. */
export function haversineMiles(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Project to a local flat frame (miles) around a reference latitude. */
function toXY(p: LatLng, refLat: number): { x: number; y: number } {
  const kx = Math.cos(toRad(refLat)) * 69.172;
  const ky = 69.172;
  return { x: p.lng * kx, y: p.lat * ky };
}

export type RouteIndex = {
  points: LatLng[];
  /** Cumulative miles at each point. */
  cum: number[];
  totalMiles: number;
};

export function indexRoute(points: LatLng[]): RouteIndex {
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + haversineMiles(points[i - 1], points[i]));
  }
  return { points, cum, totalMiles: cum[cum.length - 1] ?? 0 };
}

/**
 * Distance from a point to the route (miles) and how far along the route the
 * closest approach is (miles from origin).
 */
export function distanceToRoute(
  p: LatLng,
  route: RouteIndex,
): { detourMiles: number; alongMiles: number } {
  const { points, cum } = route;
  if (points.length === 0) return { detourMiles: Infinity, alongMiles: 0 };
  if (points.length === 1) {
    return { detourMiles: haversineMiles(p, points[0]), alongMiles: 0 };
  }
  let best = Infinity;
  let bestAlong = 0;
  const P = toXY(p, p.lat);
  for (let i = 0; i < points.length - 1; i++) {
    const A = toXY(points[i], p.lat);
    const B = toXY(points[i + 1], p.lat);
    const abx = B.x - A.x;
    const aby = B.y - A.y;
    const len2 = abx * abx + aby * aby;
    let t = 0;
    if (len2 > 0) {
      t = ((P.x - A.x) * abx + (P.y - A.y) * aby) / len2;
      t = Math.max(0, Math.min(1, t));
    }
    const qx = A.x + t * abx;
    const qy = A.y + t * aby;
    const d = Math.hypot(P.x - qx, P.y - qy);
    if (d < best) {
      best = d;
      bestAlong = cum[i] + t * (cum[i + 1] - cum[i]);
    }
  }
  return { detourMiles: best, alongMiles: bestAlong };
}

/** Douglas-Peucker simplification with a tolerance in miles. */
export function simplify(points: LatLng[], toleranceMiles: number): LatLng[] {
  if (points.length <= 2) return points;
  const refLat = points[0].lat;
  const xy = points.map((p) => toXY(p, refLat));
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    const A = xy[s];
    const B = xy[e];
    const abx = B.x - A.x;
    const aby = B.y - A.y;
    const len = Math.hypot(abx, aby) || 1e-9;
    for (let i = s + 1; i < e; i++) {
      const d = Math.abs(abx * (A.y - xy[i].y) - (A.x - xy[i].x) * aby) / len;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > toleranceMiles && idx > 0) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Reduce a route to at most `max` points, keeping shape. */
export function simplifyTo(points: LatLng[], max: number): LatLng[] {
  let tol = 0.1;
  let out = simplify(points, tol);
  while (out.length > max && tol < 50) {
    tol *= 1.6;
    out = simplify(points, tol);
  }
  if (out.length > max) {
    const step = Math.ceil(out.length / max);
    out = out.filter((_, i) => i % step === 0 || i === out.length - 1);
  }
  return out;
}

/** Google encoded-polyline encoder (precision 5). */
export function encodePolyline(points: LatLng[]): string {
  let out = "";
  let prevLat = 0;
  let prevLng = 0;
  const enc = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    let s = "";
    while (n >= 0x20) {
      s += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    return s + String.fromCharCode(n + 63);
  };
  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    out += enc(lat - prevLat) + enc(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return out;
}

/** Google encoded-polyline decoder (precision 5). */
export function decodePolyline(str: string): LatLng[] {
  const pts: LatLng[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  while (i < str.length) {
    for (const which of ["lat", "lng"] as const) {
      let shift = 0;
      let result = 0;
      let b: number;
      do {
        b = str.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === "lat") lat += delta;
      else lng += delta;
    }
    pts.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return pts;
}

export function bounds(points: LatLng[]): [LatLng, LatLng] | null {
  if (!points.length) return null;
  let minLat = Infinity,
    minLng = Infinity,
    maxLat = -Infinity,
    maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return [
    { lat: minLat, lng: minLng },
    { lat: maxLat, lng: maxLng },
  ];
}

/** Interpolate a point at a given mile marker along a route. */
export function pointAtMile(route: RouteIndex, mile: number): LatLng {
  const { points, cum } = route;
  if (mile <= 0) return points[0];
  if (mile >= route.totalMiles) return points[points.length - 1];
  let i = 1;
  while (i < cum.length && cum[i] < mile) i++;
  const t = (mile - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
  return {
    lat: points[i - 1].lat + t * (points[i].lat - points[i - 1].lat),
    lng: points[i - 1].lng + t * (points[i].lng - points[i - 1].lng),
  };
}

export const fmtMiles = (m: number | undefined) =>
  m == null || !isFinite(m) ? "" : m < 10 ? `${m.toFixed(1)} mi` : `${Math.round(m)} mi`;

export const fmtDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};
