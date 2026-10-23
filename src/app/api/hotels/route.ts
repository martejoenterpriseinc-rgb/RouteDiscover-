import { NextResponse } from "next/server";
import { handleError, parseArea, readJson } from "@/lib/api";
import { decorateResults } from "@/lib/business";
import { searchHotels, type LodgingKinds } from "@/lib/providers/chargers";

/** POST { route[] | center, radiusMiles, kinds?: ("hotel"|"campground")[] } → hotels/campgrounds with EV charging details. */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const area = parseArea(body, 50);
  if (area instanceof NextResponse) return area;
  try {
    const kinds = (Array.isArray(body.kinds) ? body.kinds.filter((k): k is "hotel" | "campground" => k === "hotel" || k === "campground") : ["hotel"]) as LodgingKinds;
    const r = await searchHotels(area, kinds.length ? kinds : ["hotel"]);
    return NextResponse.json({ ...r, data: await decorateResults(r.data) });
  } catch (err) {
    return handleError(err);
  }
}
