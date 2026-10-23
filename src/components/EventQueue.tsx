"use client";

import { useEffect, useState } from "react";
import { Disclosure } from "./Disclosure";
import { Badge, Button } from "./ui";
import { EVENT_KIND_BY_ID, fmtEventWhen } from "@/lib/event-kinds";
import type { Happening } from "@/lib/types";

type Row = Happening & { status: "pending" | "approved" | "rejected"; submittedBy: string | null; createdAt: string };

export function EventQueue() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => fetch("/api/owner/happenings?status=pending").then((r) => r.json()).then((j: { events?: Row[] }) => setRows(j.events ?? [])).catch(() => setRows([]));
  useEffect(() => {
    void load();
  }, []);
  async function decide(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    await fetch("/api/owner/happenings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision }) });
    setBusy(null);
    void load();
  }
  return (
    <Disclosure id="mod-events" title="Events submitted by travelers" size="lg" aside={<Badge tone={rows?.length ? "blue" : "neutral"}>{rows?.length ?? "…"} waiting</Badge>} className="rounded-2xl border border-border bg-surface p-4" bodyClassName="mt-3">
      {rows === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">No events waiting. Travelers can add yard sales, cruise-ins, fairs and markets from the Events screen; they appear here first.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="font-semibold">{EVENT_KIND_BY_ID[r.kind]?.emoji} {r.title} <span className="font-normal text-muted">· {EVENT_KIND_BY_ID[r.kind]?.label}</span></p>
                <p className="text-sm">{fmtEventWhen(r)}{r.price ? ` · ${r.price}` : ""}</p>
                <p className="text-xs text-muted">{[r.venue, r.address].filter(Boolean).join(" · ")}{r.url ? ` · ${r.url}` : ""}</p>
                {r.description && <p className="mt-1 text-sm text-muted">“{r.description}”</p>}
                <p className="mt-1 text-xs text-muted">From {r.submittedBy ?? "a traveler"} · {new Date(r.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button className="px-3 py-1 text-xs" disabled={busy === r.id} onClick={() => decide(r.id, "approved")}>Approve</Button>
                <Button variant="ghost" className="px-2 py-1 text-xs text-coral" disabled={busy === r.id} onClick={() => decide(r.id, "rejected")}>Reject</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Disclosure>
  );
}
