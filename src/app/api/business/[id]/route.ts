import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Business } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canManage, getBusiness, present } from "@/lib/business";
import { body, fail, handle, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };
const FIELDS = ["name", "address", "phone", "website", "hours", "description", "menu", "specials"] as const;
const LIMITS: Record<(typeof FIELDS)[number], number> = { name: 200, address: 300, phone: 50, website: 500, hours: 300, description: 2000, menu: 8000, specials: 2000 };

/** PATCH { field: value | null } — null clears an override back to the synced value. */
export async function PATCH(req: Request, { params }: Ctx) {
  const b = await body(req);
  try {
    const user = await requireUser();
    const business = await getBusiness((await params).id);
    if (!business) return fail("Listing not found.", 404);
    if (!canManage(user, business)) return fail("You don't manage this business.", 403);
    const patch: Partial<Business> = { updatedAt: new Date() };
    for (const f of FIELDS) {
      if (!(f in b)) continue;
      const v = b[f];
      if (v === null) patch[f] = null;
      else if (typeof v === "string") patch[f] = v.trim().slice(0, LIMITS[f]) || null;
    }
    const db = await getDb();
    const [updated] = await db.update(schema.businesses).set(patch).where(eq(schema.businesses.id, business.id)).returning();
    return json({ business: present(updated) });
  } catch (err) {
    return handle(err);
  }
}
