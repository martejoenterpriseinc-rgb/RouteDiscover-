import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { canManage, getBusiness, pendingSubmissions } from "@/lib/business";
import { fail, handle, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** Pending customer updates for the business owner (flagged ones are held for the RouteDiscover owner). */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const business = await getBusiness((await params).id);
    if (!business) return fail("Listing not found.", 404);
    if (!canManage(user, business)) return fail("You don't manage this business.", 403);
    const rows = await pendingSubmissions(business.id, user.role === "owner");
    const db = await getDb();
    const out = [];
    for (const r of rows) {
      const u = await db.query.users.findFirst({ where: eq(schema.users.id, r.userId) });
      out.push({ ...r, createdAt: r.createdAt.toISOString(), reviewedAt: r.reviewedAt?.toISOString() ?? null, author: u?.name?.split(" ")[0] || "Traveler" });
    }
    const heldCount = (await pendingSubmissions(business.id, true)).filter((r) => r.flagged).length;
    return json({ queue: out, heldForAudit: heldCount });
  } catch (err) {
    return handle(err);
  }
}
