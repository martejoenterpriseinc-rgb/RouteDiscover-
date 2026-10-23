"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button } from "./ui";

export type RequestRow = {
  id: string;
  email: string;
  name: string;
  note: string;
  status: "pending" | "approved" | "declined";
  freeDays: number;
  emailSent: boolean;
  accepted: boolean;
  linkExpired: boolean;
  createdAt: string;
  decidedAt: string | null;
};

export function AccountRequests({ requests, defaultFreeDays, mode }: { requests: RequestRow[]; defaultFreeDays: number; mode: "open" | "approval" | "closed" }) {
  const router = useRouter();
  const [days, setDays] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, { url: string; emailSent: boolean; reason?: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending" && !r.accepted).slice(0, 20);

  async function act(id: string, action: "approve" | "decline") {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/owner/requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, freeDays: Number(days[id] ?? defaultFreeDays) }),
      });
      const j = (await res.json()) as { error?: string; url?: string; emailSent?: boolean; emailReason?: string };
      if (!res.ok) throw new Error(j.error || "Something went wrong.");
      if (action === "approve" && j.url) setLinks((l) => ({ ...l, [id]: { url: j.url!, emailSent: !!j.emailSent, reason: j.emailReason } }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const Link = ({ id }: { id: string }) => {
    const l = links[id];
    if (!l) return null;
    return (
      <div className="mt-2 rounded-lg border border-border bg-background p-2 text-xs">
        <p className={l.emailSent ? "text-green" : "text-orange"}>{l.emailSent ? "Invitation emailed." : `Email not sent (${l.reason ?? "no email provider"}). Send this link yourself; it works for 14 days:`}</p>
        <input readOnly value={l.url} onFocus={(e) => e.currentTarget.select()} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1 text-[11px]" />
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Account requests</h2>
          <p className="text-xs text-muted">
            {mode === "approval" ? "Sign-ups are by approval. " : mode === "closed" ? "Sign-ups are closed, so no new requests arrive. " : "Sign-ups are open, so people can join without asking. "}
            Approve with complimentary days (free access, no payment) or with 0 days so they pay like everyone else.
          </p>
        </div>
        <Badge tone={pending.length ? "blue" : "neutral"}>{pending.length} waiting</Badge>
      </div>
      {error && <p className="mt-2 text-sm text-coral">{error}</p>}
      {pending.length === 0 && decided.length === 0 && <p className="mt-3 text-sm text-muted">No requests yet.</p>}
      {pending.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {pending.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="font-semibold">{r.name || "(no name)"} <span className="font-normal text-muted">· {r.email}</span></p>
                {r.note && <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted">“{r.note}”</p>}
                <p className="mt-0.5 text-xs text-muted">Requested {new Date(r.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                <Link id={r.id} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-1 text-xs text-muted">
                  Free days
                  <input type="number" min="0" max="365" className="w-16 rounded border border-border bg-background px-2 py-1 text-sm text-foreground" value={days[r.id] ?? String(defaultFreeDays)} onChange={(e) => setDays({ ...days, [r.id]: e.target.value })} />
                </label>
                <Button className="px-3 py-1 text-xs" disabled={busy === r.id} onClick={() => act(r.id, "approve")}>
                  {Number(days[r.id] ?? defaultFreeDays) > 0 ? "Approve, free" : "Approve, must pay"}
                </Button>
                <Button variant="ghost" className="px-2 py-1 text-xs text-coral" disabled={busy === r.id} onClick={() => act(r.id, "decline")}>Decline</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {decided.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted">Approved but not yet joined, and declined ({decided.length})</summary>
          <ul className="mt-2 divide-y divide-border">
            {decided.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 py-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <span className="font-semibold">{r.name || "(no name)"}</span> <span className="text-muted">· {r.email}</span>{" "}
                  <Badge tone={r.status === "approved" ? "free" : "paid"}>{r.status === "approved" ? `approved · ${r.freeDays ? `${r.freeDays} free days` : "pays"}${r.emailSent ? " · emailed" : ""}${r.linkExpired ? " · link expired" : ""}` : "declined"}</Badge>
                  <Link id={r.id} />
                </div>
                <div className="flex gap-2">
                  {r.status === "approved" && <Button variant="secondary" className="px-2 py-1 text-xs" disabled={busy === r.id} onClick={() => act(r.id, "approve")}>New link</Button>}
                  {r.status === "declined" && <Button variant="secondary" className="px-2 py-1 text-xs" disabled={busy === r.id} onClick={() => act(r.id, "approve")}>Approve after all</Button>}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
