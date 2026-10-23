import { getDb, schema } from "@/db";
import { isEmail, normalizeEmail, requireUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { track } from "@/lib/events";
import { body, fail, handle, json, str } from "@/lib/http";
import { getLiveSettings } from "@/lib/settings";
import { siteOrigin } from "@/lib/site";

export async function POST(req: Request) {
  const b = await body(req);
  try {
    const user = await requireUser();
    const email = normalizeEmail(str(b.email, 200));
    const tripId = str(b.tripId, 64) || null;
    if (!isEmail(email)) return fail("Enter a valid email address.");
    const db = await getDb();
    await db.insert(schema.invites).values({ inviterId: user.id, email, channel: "email", tripId });
    const s = await getLiveSettings();
    const origin = await siteOrigin();
    const link = `${origin}/invite/${user.referralCode}`;
    const subject = `${user.name || "A friend"} invited you to ${s.app.name}`;
    const text = `${user.name || "A friend"} thinks you'd like ${s.app.name}: find everything worth stopping for on a road trip.\n\nJoin here: ${link}`;
    const html = `<p>${user.name || "A friend"} thinks you'd like <strong>${s.app.name}</strong>: find everything worth stopping for on a road trip.</p><p><a href="${link}">Join ${s.app.name}</a></p>`;
    const result = await sendEmail(email, subject, html, text);
    await track("invite_sent", { userId: user.id, meta: { channel: result.sent ? "email" : "mailto", tripId } });
    return json({
      ok: true,
      sent: result.sent,
      mailto: result.sent ? undefined : `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
    });
  } catch (err) {
    return handle(err);
  }
}
