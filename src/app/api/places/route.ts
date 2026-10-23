import { NextResponse } from "next/server";
import { rememberPlaces } from "@/lib/public-stats";
import { bad, handleError, parseArea, parseCategoryList, readJson } from "@/lib/api";
import { DEFAULT_ROUTE_CATEGORIES } from "@/lib/categories";
import { decorateResults } from "@/lib/business";
import { searchPlaces } from "@/lib/providers/places";

/** POST { route[] | center, radiusMiles, categories[] } */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const area = parseArea(body, 50);
  if (area instanceof NextResponse) return area;
  const categories = parseCategoryList(body.categories, DEFAULT_ROUTE_CATEGORIES);
  if (!categories.length) return bad("pick at least one category");
  try {
    const r = await searchPlaces({ ...area, categories });
    void rememberPlaces(r.data);
    return NextResponse.json({ ...r, data: await decorateResults(r.data) });
  } catch (err) {
    return handleError(err);
  }
}
