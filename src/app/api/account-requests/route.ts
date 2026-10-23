import { requestAccount } from "@/lib/account-requests";
import { isEmail } from "@/lib/auth";
import { body, fail, handle, json, str } from "@/lib/http";
import { getLiveSettings } from "@/lib/settings";

/** A visitor asks for an account (only while sign-ups are by approval). */
export async function POST(req: Request) {
  try {
    const s = await getLiveSettings();
    if (s.access.mode !== "approval") return fail("Account requests are not open right now.", 403);
    const b = await body(req);
    const email = str(b.email, 200);
    const name = str(b.name, 120);
    const note = str(b.note, 1000);
    if (!isEmail(email)) return fail("Enter a valid email address.");
    if (!name) return fail("Tell us your name.");
    const r = await requestAccount({ name, email, note });
    // Same answer whether or not an account already exists, so the form can't be used to look up members.
    return json({ ok: true, status: r.status === "exists" ? "pending" : r.status });
  } catch (err) {
    return handle(err);
  }
}
