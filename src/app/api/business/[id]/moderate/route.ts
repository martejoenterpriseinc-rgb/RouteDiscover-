import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { canManage, getBusiness, moderate } from "@/lib/business";
import { body, fail, handle, json, str } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** POST { submissionId, decision: approved | rejected, note? } by the business owner. */
export async function POST(req: Request, { params }: Ctx) {
  const b = await body(req);
  try {
    const user = await requireUser();
    const business = await getBusiness((await params).id);
    if (!business) return fail("Listing not found.", 404);
    if (!canManage(user, business)) return fail("You don't manage this business.", 403);
    const db = await getDb();
    const sub = await db.query.submissions.findFirst({ where: eq(schema.submissions.id, str(b.submissionId, 64)) });
    if (!sub || sub.businessId !== business.id) return fail("Submission not found.", 404);
    if (sub.status !== "pending") return fail("Already reviewed.", 409);
    if (sub.flagged && user.role !== "owner") return fail("This update was flagged for a RouteDiscover audit and can't be approved from here.", 403);
    const decision = str(b.decision, 10) === "approved" ? "approved" : "rejected";
    const updated = await moderate(sub, decision, user, user.role === "owner" ? "owner" : "business", str(b.note, 500) || undefined);
    return json({ submission: { ...updated, createdAt: updated.createdAt.toISOString(), reviewedAt: updated.reviewedAt?.toISOString() ?? null } });
  } catch (err) {
    return handle(err);
  }
}
