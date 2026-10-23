import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { clearSession, requireUser, verifyPassword } from "@/lib/auth";
import { body, fail, handle, json } from "@/lib/http";
import { invalidatePublicStats } from "@/lib/public-stats";

/** POST { password } → permanently deletes the signed-in account and its data. */
export async function POST(req: Request) {
  const b = await body(req);
  try {
    const user = await requireUser();
    if (user.role === "owner") return fail("The owner account can't be deleted from here.", 400);
    const password = typeof b.password === "string" ? b.password : "";
    if (!verifyPassword(password, user.passwordHash)) return fail("Password is incorrect.", 401);
    const db = await getDb();
    // Claimed businesses go back to unclaimed rather than disappearing for travelers.
    await db.update(schema.businesses).set({ claimStatus: "unclaimed", claimedBy: null, sponsorUntil: null }).where(eq(schema.businesses.claimedBy, user.id));
    await db.update(schema.submissions).set({ userId: "deleted" }).where(eq(schema.submissions.userId, user.id));
    await db.delete(schema.users).where(eq(schema.users.id, user.id)); // cascades sessions, preferences, trips, invites, subscriptions
    await clearSession();
    invalidatePublicStats();
    return json({ ok: true });
  } catch (err) {
    return handle(err);
  }
}
