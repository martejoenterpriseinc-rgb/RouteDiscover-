import { fetchWithTimeout, getProviderConfig, withFallback } from "../config";
import { googleGeocode } from "./google";
import { DEMO_GEORESULTS } from "../demo/data";
import type { GeoResult } from "../types";

const COORD_RE = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/** "40.03, -76.30" style input needs no network. */
export function parseCoordinates(q: string): GeoResult | null {
  const m = COORD_RE.exec(q);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng };
}

type NominatimHit = { display_name: string; lat: string; lon: string };

async function liveGeocode(q: string, limit: number): Promise<GeoResult[]> {
  const cfg = await getProviderConfig();
  const url = new URL(`${cfg.nominatimUrl}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "us,ca");
  const res = await fetchWithTimeout(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const hits = (await res.json()) as NominatimHit[];
  return hits.map((h) => ({
    label: shortenLabel(h.display_name),
    lat: Number(h.lat),
    lng: Number(h.lon),
  }));
}

function shortenLabel(display: string): string {
  // "Lancaster, Lancaster County, Pennsylvania, 17602, United States" → "Lancaster, Pennsylvania"
  const parts = display.split(",").map((s) => s.trim());
  if (parts.length <= 2) return display;
  const noZip = parts.filter((p) => !/^\d{5}(-\d{4})?$/.test(p) && p !== "United States");
  const first = noZip[0];
  const state = noZip.find((p, i) => i > 0 && !/county/i.test(p) && p !== first);
  return state ? `${first}, ${state}` : first;
}

function demoGeocode(q: string, limit: number): GeoResult[] {
  const needle = q.toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
  if (!needle) return [];
  const words = needle.split(/\s+/);
  const scored = DEMO_GEORESULTS.map((r) => {
    const hay = r.label.toLowerCase();
    let score = 0;
    if (hay.startsWith(needle)) score += 10;
    for (const w of words) if (hay.includes(w)) score += 1;
    return { r, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.r);
}

export async function geocode(q: string, limit = 5) {
  const direct = parseCoordinates(q);
  if (direct) return { source: "live" as const, data: [direct] };
  const cfg = await getProviderConfig();
  const primary = cfg.google.geocoding ? { name: "Google Geocoding", run: () => googleGeocode(cfg.google, q, limit) } : null;
  return withFallback("Geocoder", () => liveGeocode(q, limit), () => demoGeocode(q, limit), primary);
}
