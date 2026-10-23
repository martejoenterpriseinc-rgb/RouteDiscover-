import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireOwner } from "@/lib/auth";
import { body, fail, handle, json, str } from "@/lib/http";
import { createResetLink } from "@/lib/password-reset";

type Ctx = { params: Promise<{ id: string }> };

/** POST { action: "reset_link" | "ban" | "unban" } on a user, for the owner. */
export async function POST(req: Request, { params }: Ctx) {
  const b = await body(req);
  try {
    const owner = await requireOwner();
    const { id } = await params;
    const db = await getDb();
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
    if (!user) return fail("User not found.", 404);
    const action = str(b.action, 20);
    if (action === "reset_link") return json({ url: await createResetLink(user.id) });
    if (action === "ban" || action === "unban") {
      if (user.role === "owner" || user.id === owner.id) return fail("Owners can't be banned.");
      await db.update(schema.users).set({ banned: action === "ban", bannedReason: action === "ban" ? "Owner action" : null }).where(eq(schema.users.id, id));
      if (action === "ban") await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
      return json({ ok: true });
    }
    return fail("Unknown action.");
  } catch (err) {
    return handle(err);
  }
}
