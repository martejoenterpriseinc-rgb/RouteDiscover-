import { isEmail, normalizeEmail, validatePassword } from "@/lib/auth";
import { body, fail, handle, json, str } from "@/lib/http";
import { completeReset, requestReset } from "@/lib/password-reset";
import { getLiveSettings } from "@/lib/settings";

/** POST { email } → sends a link (if email is configured). POST { token, password } → sets the new password. */
export async function POST(req: Request) {
  const b = await body(req);
  try {
    if (typeof b.token === "string") {
      const password = typeof b.password === "string" ? b.password : "";
      const err = validatePassword(password);
      if (err) return fail(err);
      const ok = await completeReset(str(b.token, 200), password);
      if (!ok) return fail("That reset link is invalid or has expired. Request a new one.", 400);
      return json({ ok: true });
    }
    const email = normalizeEmail(str(b.email, 200));
    if (!isEmail(email)) return fail("Enter a valid email address.");
    const s = await getLiveSettings();
    const emailConfigured = s.integrations.email.provider !== "none" && !!s.integrations.email.apiKey;
    if (!emailConfigured) {
      return json({ ok: true, emailConfigured: false, support: s.app.supportEmail });
    }
    await requestReset(email);
    return json({ ok: true, emailConfigured: true });
  } catch (err) {
    return handle(err);
  }
}
