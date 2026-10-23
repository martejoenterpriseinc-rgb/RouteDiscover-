import "server-only";
import { getLiveSettings } from "./settings";

export type SmsResult = { sent: boolean; reason?: string };

/** Sends a text through Twilio when the owner has connected it. */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const s = await getLiveSettings();
  const c = s.integrations.sms;
  if (c.provider !== "twilio" || !c.accountSid || !c.authToken || !c.from) return { sent: false, reason: "sms not configured" };
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(c.accountSid)}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${c.accountSid}:${c.authToken}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: c.from, Body: body }).toString(),
    });
    if (!res.ok) return { sent: false, reason: `Twilio HTTP ${res.status}` };
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : "send failed" };
  }
}
