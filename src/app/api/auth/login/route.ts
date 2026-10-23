import { authenticate, createSession, setSessionCookie } from "@/lib/auth";
import { track } from "@/lib/events";
import { body, fail, handle, json, str } from "@/lib/http";

export async function POST(req: Request) {
  const b = await body(req);
  const email = str(b.email, 200);
  const password = typeof b.password === "string" ? b.password : "";
  if (!email || !password) return fail("Email and password are required.");
  try {
    const user = await authenticate(email, password);
    const { token, expires } = await createSession(user.id);
    await setSessionCookie(token, expires);
    await track("login", { userId: user.id });
    return json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    return handle(err);
  }
}
