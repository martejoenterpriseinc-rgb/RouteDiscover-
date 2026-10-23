import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { checkSignup } from "@/lib/access";
import { REFERRAL_COOKIE, createSession, createUser, isEmail, setSessionCookie, validatePassword } from "@/lib/auth";
import { track } from "@/lib/events";
import { body, fail, handle, json, str } from "@/lib/http";

export async function POST(req: Request) {
  const b = await body(req);
  const email = str(b.email, 200);
  const name = str(b.name, 120);
  const password = typeof b.password === "string" ? b.password : "";
  if (!isEmail(email)) return fail("Enter a valid email address.");
  if (!name) return fail("Tell us your name.");
  const pwErr = validatePassword(password);
  if (pwErr) return fail(pwErr);
  try {
    const jar = await cookies();
    const ref = jar.get(REFERRAL_COOKIE)?.value ?? str(b.referral, 32);
    let referredBy: string | null = null;
    if (ref) {
      const db = await getDb();
      const inviter = await db.query.users.findFirst({ where: eq(schema.users.referralCode, ref.toUpperCase()) });
      referredBy = inviter?.id ?? null;
    }
    const gate = await checkSignup(!!referredBy);
    if (!gate.open) return fail(gate.message || "Sign-ups are closed right now.", 403);
    const user = await createUser({ email, name, password, referredBy });
    if (referredBy) {
      const db = await getDb();
      await db
        .update(schema.invites)
        .set({ acceptedBy: user.id, acceptedAt: new Date() })
        .where(eq(schema.invites.email, user.email));
      await track("invite_accepted", { userId: user.id, meta: { inviterId: referredBy } });
    }
    const { token, expires } = await createSession(user.id);
    await setSessionCookie(token, expires);
    jar.delete(REFERRAL_COOKIE);
    return json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    return handle(err);
  }
}
