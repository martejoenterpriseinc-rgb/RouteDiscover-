import { NextResponse } from "next/server";
import { parseCategories } from "./categories";
import { ProviderError } from "./config";
import { simplifyTo } from "./geo";
import type { CategoryId, GeoResult, LatLng } from "./types";

export type AreaBody =
  | { kind: "corridor"; route: LatLng[]; radiusMiles: number }
  | { kind: "point"; center: LatLng; radiusMiles: number };

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function parseLatLng(v: unknown): LatLng | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!isNum(o.lat) || !isNum(o.lng)) return null;
  if (Math.abs(o.lat) > 90 || Math.abs(o.lng) > 180) return null;
  return { lat: o.lat, lng: o.lng };
}

export function parseGeoResult(v: unknown): GeoResult | null {
  const ll = parseLatLng(v);
  if (!ll) return null;
  const label = (v as Record<string, unknown>).label;
  return { ...ll, label: typeof label === "string" ? label : `${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}` };
}

export function clampRadius(v: unknown, min: number, max: number, dflt: number): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (!isNum(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

/**
 * Parse a search area from a JSON body: either a route corridor
 * ({route:[...], radiusMiles}) or a point ({center:{lat,lng}, radiusMiles}).
 */
export function parseArea(body: Record<string, unknown>, maxRadius: number): AreaBody | NextResponse {
  const radiusMiles = clampRadius(body.radiusMiles, 0.1, maxRadius, Math.min(10, maxRadius));
  if (Array.isArray(body.route)) {
    const route = body.route.map(parseLatLng).filter((p): p is LatLng => !!p);
    if (route.length < 2) return bad("route needs at least two points");
    if (route.length > 5000) return bad("route has too many points; simplify it first");
    return { kind: "corridor", route: simplifyTo(route, 1500), radiusMiles };
  }
  const center = parseLatLng(body.center);
  if (center) return { kind: "point", center, radiusMiles };
  return bad("provide either route[] or center{lat,lng}");
}

export function parseCategoryList(v: unknown, fallback: CategoryId[]): CategoryId[] {
  if (Array.isArray(v)) return parseCategories(v.join(","));
  if (typeof v === "string") return parseCategories(v);
  return fallback;
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson(req: Request): Promise<Record<string, unknown> | NextResponse> {
  try {
    const j = (await req.json()) as unknown;
    if (!j || typeof j !== "object") return bad("JSON body required");
    return j as Record<string, unknown>;
  } catch {
    return bad("invalid JSON body");
  }
}

export function handleError(err: unknown) {
  if (err instanceof ProviderError) {
    return NextResponse.json({ error: err.message, provider: err.provider }, { status: 502 });
  }
  console.error(err);
  return NextResponse.json({ error: "unexpected error" }, { status: 500 });
}
