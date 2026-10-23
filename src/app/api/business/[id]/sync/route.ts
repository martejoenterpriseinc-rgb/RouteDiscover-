import { requireUser } from "@/lib/auth";
import { canManage, getBusiness, present, syncFromSource } from "@/lib/business";
import { fail, handle, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** POST → re-fetch the online listing and refresh the synced layer (owner overrides are kept). */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const business = await getBusiness((await params).id);
    if (!business) return fail("Listing not found.", 404);
    if (!canManage(user, business)) return fail("You don't manage this business.", 403);
    const r = await syncFromSource(business);
    return json({ business: present(r.business), changed: r.changed, source: r.source });
  } catch (err) {
    return handle(err);
  }
}
