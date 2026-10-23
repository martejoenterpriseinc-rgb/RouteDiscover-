import { NextResponse } from "next/server";
import { fetchWithTimeout, getProviderConfig } from "@/lib/config";
import type { LatLng } from "@/lib/types";

type Geom = { lat: number; lon: number };
type El = { type: string; id: number; geometry?: Geom[]; members?: Array<{ type: string; ref: number; role?: string; geometry?: Geom[] }> };

/** GET /api/trails/osm-relation-123 → the trail's line geometry from OpenStreetMap, for drawing on the map. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = id.match(/^osm-(relation|way)-(\d+)$/);
  if (!m) return NextResponse.json({ lines: [] });
  const cfg = await getProviderConfig();
  const q = `[out:json][timeout:25];${m[1] === "relation" ? "rel" : "way"}(${m[2]});out geom;`;
  try {
    const res = await fetchWithTimeout(cfg.overpassUrl, { method: "POST", body: `data=${encodeURIComponent(q)}`, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { elements?: El[] };
    const lines: LatLng[][] = [];
    for (const el of json.elements ?? []) {
      if (el.geometry) lines.push(el.geometry.map((g) => ({ lat: g.lat, lng: g.lon })));
      for (const mem of el.members ?? []) if (mem.type === "way" && mem.geometry) lines.push(mem.geometry.map((g) => ({ lat: g.lat, lng: g.lon })));
    }
    return NextResponse.json({ lines: lines.slice(0, 400) }, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch (err) {
    return NextResponse.json({ lines: [], error: err instanceof Error ? err.message : "trail unavailable" });
  }
}
