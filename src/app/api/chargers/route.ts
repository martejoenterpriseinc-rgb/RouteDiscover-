import { NextResponse } from "next/server";
import { rememberPlaces } from "@/lib/public-stats";
import { handleError, parseArea, readJson } from "@/lib/api";
import type { ConnectorType } from "@/lib/ev-networks";
import { searchChargers, searchSuperchargers, type ChargerFilters } from "@/lib/providers/chargers";

const CONNECTORS: ConnectorType[] = ["nacs", "ccs", "chademo", "j1772", "type2", "other"];

/**
 * POST { route[] | center, radiusMiles, networks?, connectors?, minKw?, cost?, superchargersOnly? }
 * → EV chargers from every network in the area (or Tesla Superchargers only).
 */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const area = parseArea(body, 50);
  if (area instanceof NextResponse) return area;
  const filters: ChargerFilters = {
    networks: Array.isArray(body.networks) ? body.networks.filter((n): n is string => typeof n === "string").slice(0, 60) : [],
    connectors: Array.isArray(body.connectors) ? body.connectors.filter((c): c is ConnectorType => CONNECTORS.includes(c as ConnectorType)) : [],
    minKw: typeof body.minKw === "number" && Number.isFinite(body.minKw) ? Math.max(0, Math.min(1000, body.minKw)) : 0,
    cost: body.cost === "free" || body.cost === "paid" ? body.cost : "any",
  };
  try {
    const r = body.superchargersOnly === true ? await searchSuperchargers(area) : await searchChargers(area, filters);
    void rememberPlaces(r.data.map((c) => ({ id: c.id, name: c.name, category: "ev", lat: c.lat, lng: c.lng })));
    return NextResponse.json(r);
  } catch (err) {
    return handleError(err);
  }
}
