import { desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireOwner } from "@/lib/auth";
import { present, revokeClaim } from "@/lib/business";
import { body, fail, handle, json, str } from "@/lib/http";

export async function GET() {
  try {
    await requireOwner();
    const db = await getDb();
    const rows = await db.select().from(schema.businesses).orderBy(desc(schema.businesses.updatedAt)).limit(500);
    const plans = rows.length ? await db.select().from(schema.businessPlans).where(inArray(schema.businessPlans.businessId, rows.map((r) => r.id))).orderBy(desc(schema.businessPlans.createdAt)) : [];
    const claimantIds = Array.from(new Set(rows.map((r) => r.claimedBy).filter((x): x is string => !!x)));
    const claimants = claimantIds.length ? await db.select({ id: schema.users.id, email: schema.users.email, name: schema.users.name }).from(schema.users).where(inArray(schema.users.id, claimantIds)) : [];
    const byUser = new Map(claimants.map((c) => [c.id, c]));
    const now = Date.now();
    const list = rows.map((b) => {
      const mine = plans.filter((p) => p.businessId === b.id);
      const active = mine.filter((p) => p.status === "active" && (!p.endsAt || p.endsAt.getTime() > now));
      const revenueCents = mine.filter((p) => p.status !== "pending").reduce((s, p) => s + p.amountCents, 0);
      return {
        ...present(b),
        claimStatus: b.claimStatus,
        claimedAt: b.claimedAt?.toISOString() ?? null,
        claimant: b.claimedBy ? (byUser.get(b.claimedBy) ?? null) : null,
        tier: b.sponsorUntil && b.sponsorUntil.getTime() > now ? "sponsor" : active.some((p) => p.plan === "basic") ? "basic" : b.claimStatus === "claimed" ? "lapsed" : "none",
        basicRef: active.find((p) => p.plan === "basic")?.stripeRef ?? null,
        paid: mine.some((p) => p.stripeRef && p.stripeRef !== "manual"),
        revenueCents,
        plans: mine.map((p) => ({ id: p.id, plan: p.plan, status: p.status, amountCents: p.amountCents, stripeRef: p.stripeRef, startsAt: p.startsAt?.toISOString() ?? null, endsAt: p.endsAt?.toISOString() ?? null })),
      };
    });
    const totals = {
      listings: list.length,
      claimed: list.filter((b) => b.claimStatus === "claimed").length,
      basic: list.filter((b) => b.tier === "basic").length,
      sponsors: list.filter((b) => b.tier === "sponsor").length,
      revenueCents: list.reduce((s, b) => s + b.revenueCents, 0),
    };
    return json({ businesses: list, totals });
  } catch (err) {
    return handle(err);
  }
}

/** POST { businessId, action: "revoke" } */
export async function POST(req: Request) {
  const b = await body(req);
  try {
    await requireOwner();
    const id = str(b.businessId, 64);
    const db = await getDb();
    const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.id, id) });
    if (!business) return fail("Business not found.", 404);
    if (str(b.action, 10) === "revoke") {
      await revokeClaim(id);
      return json({ ok: true });
    }
    return fail("Unknown action.");
  } catch (err) {
    return handle(err);
  }
}
