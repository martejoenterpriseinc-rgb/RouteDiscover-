import "server-only";
import { getLiveSettings } from "./settings";

export type SendResult = { sent: boolean; reason?: string };

/** Sends through Resend when the owner has connected it; otherwise reports back so the UI can fall back to mailto. */
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  const s = await getLiveSettings();
  const e = s.integrations.email;
  if (e.provider !== "resend" || !e.apiKey || !e.from) return { sent: false, reason: "email not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${e.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: e.from, to: [to], subject, html, text }),
    });
    if (!res.ok) return { sent: false, reason: `Resend HTTP ${res.status}` };
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : "send failed" };
  }
}
