"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button, ErrorNote } from "./ui";

const field = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none ring-blue/40 focus:ring-2";

/**
 * Get a RouteDiscover link onto your phone: scan a QR code (free, instant),
 * text it (via the owner's SMS provider, else your own messaging app), or
 * email it to yourself.
 */
export function SendToPhone({ path, title, compact = false }: { path: string; title: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<"sms" | "email" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: "#1c2b5a", light: "#ffffff" } }).then(setQr).catch(() => setQr(null));
  }, [open, url]);

  async function send(channel: "sms" | "email") {
    setBusy(channel);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/send-to-phone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, title, channel, phone }) });
      const j = (await res.json()) as { error?: string; sent?: boolean; to?: string; smsFallback?: string; reason?: string };
      if (!res.ok) throw new Error(j.error || "Could not send.");
      if (j.sent) setMsg(channel === "sms" ? `Text sent to ${j.to}.` : `Email sent to ${j.to}.`);
      else if (channel === "sms" && j.smsFallback) {
        window.location.href = j.smsFallback;
        setMsg("Opening your messaging app with the link. Send it to your own number.");
      } else setMsg("Email isn't connected yet. Scan the QR code or use text instead.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={compact ? "" : "relative"}>
      <Button variant="secondary" className={compact ? "px-3 py-1 text-xs" : ""} onClick={() => setOpen((o) => !o)}>
        📲 Send to phone
      </Button>
      {open && (
        <div className="mt-2 rounded-2xl border-2 border-blue bg-surface p-4 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">Send to your phone</h3>
              <p className="text-xs text-muted">Scan with your phone&apos;s camera, or send yourself the link.</p>
            </div>
            <Button variant="ghost" onClick={() => setOpen(false)} aria-label="Close">✕</Button>
          </div>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row">
            <div className="flex shrink-0 flex-col items-center gap-1">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt={`QR code for ${title}`} width={160} height={160} className="rounded-lg border border-border" />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-border text-xs text-muted">QR…</div>
              )}
              <span className="text-[11px] text-muted">Scan to open</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className={`${field} text-xs`} />
              <div className="flex gap-2">
                <input className={field} type="tel" placeholder="Mobile number (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Button variant="secondary" disabled={busy !== null} onClick={() => send("sms")}>{busy === "sms" ? "…" : "Text me"}</Button>
              </div>
              <Button variant="secondary" disabled={busy !== null} onClick={() => send("email")}>{busy === "email" ? "Sending…" : "Email it to me"}</Button>
              {msg && <p className="text-sm text-green">{msg}</p>}
              {error && <ErrorNote>{error}</ErrorNote>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
