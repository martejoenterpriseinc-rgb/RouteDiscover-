import { NextResponse } from "next/server";
import { rememberPlaces } from "@/lib/public-stats";
import { handleError, parseArea, readJson } from "@/lib/api";
import { searchSuperchargers } from "@/lib/providers/chargers";

/** POST { route[] | center, radiusMiles } → Tesla Superchargers in the area. */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const area = parseArea(body, 50);
  if (area instanceof NextResponse) return area;
  try {
    const r = await searchSuperchargers(area);
    void rememberPlaces(r.data.map((c) => ({ id: c.id, name: c.name, category: "ev", lat: c.lat, lng: c.lng })));
    return NextResponse.json(r);
  } catch (err) {
    return handleError(err);
  }
}
