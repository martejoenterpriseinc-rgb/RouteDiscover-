import { parseLatLng } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { ensureListing } from "@/lib/business";
import { isCategoryId } from "@/lib/categories";
import { body, fail, handle, json, str } from "@/lib/http";
import type { Place } from "@/lib/types";

/** POST { place } → { id } : find or create the listing for a search result. */
export async function POST(req: Request) {
  const b = await body(req);
  try {
    await requireUser();
    const o = (b.place ?? {}) as Record<string, unknown>;
    const ll = parseLatLng(o);
    const id = str(o.id, 120);
    const name = str(o.name, 200);
    if (!ll || !id || !name) return fail("place with id, name, lat, lng required");
    const place: Place = {
      id,
      name,
      category: typeof o.category === "string" && isCategoryId(o.category) ? o.category : "attractions",
      lat: ll.lat,
      lng: ll.lng,
      address: str(o.address, 300) || undefined,
      website: str(o.website, 500) || undefined,
      phone: str(o.phone, 50) || undefined,
      openingHours: str(o.openingHours, 300) || undefined,
      tags: o.tags && typeof o.tags === "object" ? (o.tags as Record<string, string>) : undefined,
      provider: o.provider === "google" || o.provider === "osm" || o.provider === "ocm" || o.provider === "demo" ? o.provider : undefined,
      google: o.google && typeof o.google === "object" ? (o.google as Place["google"]) : undefined,
    };
    const row = await ensureListing(place);
    return json({ id: row.id });
  } catch (err) {
    return handle(err);
  }
}
