import { NextResponse } from "next/server";
import { bad, handleError, parseGeoResult, readJson } from "@/lib/api";
import { geocode } from "@/lib/providers/geocode";
import { route } from "@/lib/providers/routing";
import type { GeoResult } from "@/lib/types";

async function resolve(v: unknown, what: string): Promise<GeoResult | NextResponse> {
  const direct = parseGeoResult(v);
  if (direct) return direct;
  if (typeof v === "string" && v.trim().length >= 2) {
    const r = await geocode(v.trim(), 1);
    if (r.data[0]) return r.data[0];
    return bad(`could not find ${what}: "${v}"`, 404);
  }
  return bad(`${what} is required (text or {lat,lng})`);
}

const MAX_VIA = 25;

/** POST { origin, destination, via? } where each point is a place name or {lat,lng,label}; via is a list of stops in order. */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  try {
    const origin = await resolve(body.origin, "origin");
    if (origin instanceof NextResponse) return origin;
    const destination = await resolve(body.destination, "destination");
    if (destination instanceof NextResponse) return destination;
    const via: GeoResult[] = [];
    if (Array.isArray(body.via)) {
      if (body.via.length > MAX_VIA) return bad(`at most ${MAX_VIA} stops per drive`);
      for (const v of body.via) {
        const g = parseGeoResult(v);
        if (!g) return bad("each stop needs lat, lng and a label");
        via.push(g);
      }
    }
    const r = await route(origin, destination, via);
    return NextResponse.json({ source: r.source, notice: r.notice, data: { ...r.data, source: r.source } });
  } catch (err) {
    return handleError(err);
  }
}
