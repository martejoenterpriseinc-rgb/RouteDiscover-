import { and, count, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { track } from "@/lib/events";
import { body, fail, handle, json, str } from "@/lib/http";
import { getLiveSettings } from "@/lib/settings";
import { siteOrigin } from "@/lib/site";
import { sendSms } from "@/lib/sms";
import { normalizePhone } from "@/lib/phone";

const DAILY_LIMIT = 20;

/**
 * POST { path, title, channel: "sms" | "email", phone? }
 * Sends a link to the user's own phone. Only paths on this site are allowed.
 */
export async function POST(req: Request) {
  const b = await body(req);
  try {
    const user = await requireUser();
    const path = str(b.path, 500);
    const title = str(b.title, 120) || "RouteDiscover";
    const channel = str(b.channel, 10) === "sms" ? "sms" : "email";
    if (!path.startsWith("/") || path.startsWith("//")) return fail("Only RouteDiscover links can be sent.");
    const db = await getDb();
    const since = new Date(Date.now() - 86400_000);
    const [{ c }] = await db.select({ c: count() }).from(schema.events).where(and(eq(schema.events.type, "send_to_phone"), eq(schema.events.userId, user.id), gte(schema.events.createdAt, since), sql`${schema.events.meta} ->> 'sent' = 'true'`));
    if (Number(c) >= DAILY_LIMIT) return fail("Daily send limit reached. Scan the QR code instead.", 429);
    const url = `${await siteOrigin()}${path}`;
    const s = await getLiveSettings();
    const text = `${title} on ${s.app.name}: ${url}`;
    let result: { sent: boolean; reason?: string };
    let to = "";
    if (channel === "sms") {
      const phone = normalizePhone(str(b.phone, 30)) ?? (await db.query.preferences.findFirst({ where: eq(schema.preferences.userId, user.id) }))?.data.phone;
      if (!phone) return fail("Add your mobile number first.");
      to = phone;
      result = await sendSms(phone, text);
      if (phone && typeof b.phone === "string" && b.phone.trim()) {
        const row = await db.query.preferences.findFirst({ where: eq(schema.preferences.userId, user.id) });
        await db.insert(schema.preferences).values({ userId: user.id, data: { ...(row?.data ?? schema.DEFAULT_PREFERENCES), phone } }).onConflictDoUpdate({ target: schema.preferences.userId, set: { data: { ...(row?.data ?? schema.DEFAULT_PREFERENCES), phone }, updatedAt: new Date() } });
      }
    } else {
      to = user.email;
      result = await sendEmail(user.email, `${title} · sent to your phone`, `<p>Open this on your phone:</p><p><a href="${url}">${title}</a></p>`, text);
    }
    await track("send_to_phone", { userId: user.id, meta: { channel, sent: result.sent, path } });
    return json({ ok: true, sent: result.sent, to, reason: result.reason, url, smsFallback: `sms:?&body=${encodeURIComponent(text)}` });
  } catch (err) {
    return handle(err);
  }
}
