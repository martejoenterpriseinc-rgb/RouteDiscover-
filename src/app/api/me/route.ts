import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getAccess } from "@/lib/billing";
import { getCurrentUser } from "@/lib/auth";
import { handle, json } from "@/lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ user: null });
    const db = await getDb();
    const prefs = await db.query.preferences.findFirst({ where: eq(schema.preferences.userId, user.id) });
    const access = await getAccess(user);
    return json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, referralCode: user.referralCode, createdAt: user.createdAt },
      preferences: prefs?.data ?? schema.DEFAULT_PREFERENCES,
      access,
    });
  } catch (err) {
    return handle(err);
  }
}
