import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";

/** GET → downloadable JSON of everything stored for the signed-in user. */
export async function GET() {
  try {
    const user = await requireUser();
    const db = await getDb();
    const [prefs, trips, invites, subs, submissions, referrals, credits, businesses] = await Promise.all([
      db.query.preferences.findFirst({ where: eq(schema.preferences.userId, user.id) }),
      db.query.trips.findMany({ where: eq(schema.trips.userId, user.id) }),
      db.query.invites.findMany({ where: eq(schema.invites.inviterId, user.id) }),
      db.query.subscriptions.findMany({ where: eq(schema.subscriptions.userId, user.id) }),
      db.query.submissions.findMany({ where: eq(schema.submissions.userId, user.id) }),
      db.query.referrals.findMany({ where: eq(schema.referrals.referrerId, user.id) }),
      db.query.credits.findMany({ where: eq(schema.credits.userId, user.id) }),
      db.query.businesses.findMany({ where: eq(schema.businesses.claimedBy, user.id) }),
    ]);
    const data = {
      exportedAt: new Date().toISOString(),
      profile: { id: user.id, email: user.email, name: user.name, role: user.role, referralCode: user.referralCode, createdAt: user.createdAt, lastSeenAt: user.lastSeenAt },
      preferences: prefs?.data ?? null,
      trips,
      invites: invites.map((i) => ({ ...i, email: i.email })),
      passesAndSubscriptions: subs.map(({ id, kind, status, amountCents, currentPeriodEnd, createdAt }) => ({ id, kind, status, amountCents, currentPeriodEnd, createdAt })),
      communityUpdates: submissions.map(({ id, businessId, type, payload, status, createdAt }) => ({ id, businessId, type, payload, status, createdAt })),
      referrals: referrals.map(({ id, paidPeriods, qualifiedAt, createdAt }) => ({ id, paidPeriods, qualifiedAt, createdAt })),
      credits,
      claimedBusinesses: businesses.map((b) => ({ id: b.id, placeId: b.placeId, name: b.name ?? b.source.name, claimedAt: b.claimedAt })),
    };
    return new Response(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="routediscover-export-${new Date().toISOString().slice(0, 10)}.json"` },
    });
  } catch (err) {
    return handle(err);
  }
}
