import { getDb, schema } from "@/db";
import type { SubmissionPayload, SubmissionType } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getBusiness, submitterContext } from "@/lib/business";
import { track } from "@/lib/events";
import { body, fail, handle, json, str } from "@/lib/http";
import { scoreSubmission } from "@/lib/moderation";
import { getLiveSettings } from "@/lib/settings";

type Ctx = { params: Promise<{ id: string }> };
const TYPES: SubmissionType[] = ["review", "menu", "special", "hours", "info"];
const FIELDS = ["name", "address", "phone", "website", "hours", "description"] as const;

/** POST { type, text?, rating?, field?, value? } → a pending submission (photos use /photos). */
export async function POST(req: Request, { params }: Ctx) {
  const b = await body(req);
  try {
    const user = await requireUser();
    if (user.banned) return fail("This account can't submit updates.", 403);
    const business = await getBusiness((await params).id);
    if (!business) return fail("Listing not found.", 404);
    const type = str(b.type, 10) as SubmissionType;
    if (!TYPES.includes(type)) return fail("Unknown submission type.");
    const payload: SubmissionPayload = {};
    if (type === "review") {
      payload.rating = Math.round(Number(b.rating));
      payload.text = str(b.text, 2000);
      if (!(payload.rating >= 1 && payload.rating <= 5)) return fail("Rating must be 1 to 5 stars.");
    } else if (type === "menu" || type === "special") {
      payload.text = str(b.text, 4000);
      if (!payload.text) return fail("Add some text.");
    } else if (type === "hours") {
      payload.value = str(b.value, 300);
      payload.text = str(b.text, 500);
      if (!payload.value) return fail("Enter the hours.");
    } else {
      const field = str(b.field, 20) as (typeof FIELDS)[number];
      if (!FIELDS.includes(field)) return fail("Unknown field.");
      payload.field = field;
      payload.value = str(b.value, field === "description" ? 2000 : 300);
      payload.text = str(b.text, 500);
      if (!payload.value) return fail("Enter the new value.");
    }
    const ctx = await submitterContext(user, business.id);
    const risk = scoreSubmission(type, payload, ctx);
    const s = await getLiveSettings();
    const flagged = risk.score >= s.business.flagThreshold;
    const db = await getDb();
    const [row] = await db.insert(schema.submissions).values({ businessId: business.id, userId: user.id, type, payload, riskScore: risk.score, riskFlags: risk.flags, flagged }).returning();
    await track("submission_created", { userId: user.id, meta: { businessId: business.id, type, riskScore: risk.score, flagged } });
    return json({ ok: true, submission: { id: row.id, status: row.status, flagged } }, { status: 201 });
  } catch (err) {
    return handle(err);
  }
}
