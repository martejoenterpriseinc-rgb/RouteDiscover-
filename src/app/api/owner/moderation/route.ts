import { and, desc, eq, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, schema } from "@/db";
import { requireOwner } from "@/lib/auth";
import { moderate, present } from "@/lib/business";
import { track } from "@/lib/events";
import { body, fail, handle, json, str } from "@/lib/http";

/** GET ?status=pending|flagged|approved|rejected|all → audit queue with business and submitter context. */
export async function GET(req: NextRequest) {
  try {
    await requireOwner();
    const db = await getDb();
    const status = req.nextUrl.searchParams.get("status") || "pending";
    const where =
      status === "flagged"
        ? and(eq(schema.submissions.status, "pending"), eq(schema.submissions.flagged, true))
        : status === "all"
          ? undefined
          : eq(schema.submissions.status, status as "pending" | "approved" | "rejected");
    const rows = await db.select().from(schema.submissions).where(where).orderBy(desc(schema.submissions.createdAt)).limit(300);
    const bizIds = Array.from(new Set(rows.map((r) => r.businessId)));
    const userIds = Array.from(new Set(rows.map((r) => r.userId)));
    const bizRows = bizIds.length ? await db.select().from(schema.businesses).where(inArray(schema.businesses.id, bizIds)) : [];
    const users = userIds.length ? await db.select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, banned: schema.users.banned, createdAt: schema.users.createdAt }).from(schema.users).where(inArray(schema.users.id, userIds)) : [];
    const biz = new Map(bizRows.map((b) => [b.id, present(b)]));
    const usr = new Map(users.map((u) => [u.id, { ...u, createdAt: u.createdAt.toISOString() }]));
    const counts = {
      pending: (await db.select({ id: schema.submissions.id }).from(schema.submissions).where(eq(schema.submissions.status, "pending"))).length,
      flagged: (await db.select({ id: schema.submissions.id }).from(schema.submissions).where(and(eq(schema.submissions.status, "pending"), eq(schema.submissions.flagged, true)))).length,
    };
    return json({
      counts,
      queue: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), reviewedAt: r.reviewedAt?.toISOString() ?? null, business: biz.get(r.businessId) ?? null, submitter: usr.get(r.userId) ?? null })),
    });
  } catch (err) {
    return handle(err);
  }
}

/** POST { submissionId, decision: approved|rejected, note? } or { userId, action: "ban"|"unban", reason? } */
export async function POST(req: Request) {
  const b = await body(req);
  try {
    const owner = await requireOwner();
    const db = await getDb();
    if (b.userId) {
      const userId = str(b.userId, 64);
      const action = str(b.action, 10);
      if (action !== "ban" && action !== "unban") return fail("Unknown action.");
      const target = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
      if (!target) return fail("User not found.", 404);
      if (target.role === "owner") return fail("Owners can't be banned.");
      await db.update(schema.users).set({ banned: action === "ban", bannedReason: action === "ban" ? str(b.reason, 300) || "Moderation" : null }).where(eq(schema.users.id, userId));
      if (action === "ban") {
        await db.update(schema.submissions).set({ status: "rejected", reviewedBy: owner.id, reviewedRole: "owner", reviewedAt: new Date(), note: "Submitter banned" }).where(and(eq(schema.submissions.userId, userId), eq(schema.submissions.status, "pending")));
        await track("user_banned", { userId: owner.id, meta: { target: userId } });
      }
      return json({ ok: true });
    }
    const sub = await db.query.submissions.findFirst({ where: eq(schema.submissions.id, str(b.submissionId, 64)) });
    if (!sub) return fail("Submission not found.", 404);
    const decision = str(b.decision, 10) === "approved" ? "approved" : "rejected";
    const updated = await moderate(sub, decision, owner, "owner", str(b.note, 500) || undefined);
    return json({ submission: { ...updated, createdAt: updated.createdAt.toISOString(), reviewedAt: updated.reviewedAt?.toISOString() ?? null } });
  } catch (err) {
    return handle(err);
  }
}
