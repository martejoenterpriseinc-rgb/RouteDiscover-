import { NextResponse } from "next/server";
import { handleError, parseArea, readJson } from "@/lib/api";
import { searchHotels } from "@/lib/providers/chargers";

/** POST { route[] | center, radiusMiles } → hotels with EV charging details. */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const area = parseArea(body, 50);
  if (area instanceof NextResponse) return area;
  try {
    const r = await searchHotels(area);
    return NextResponse.json(r);
  } catch (err) {
    return handleError(err);
  }
}
