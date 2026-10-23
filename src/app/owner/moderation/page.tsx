"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SubmissionRow } from "@/components/SubmissionRow";
import { Badge, Button, Empty, ErrorNote } from "@/components/ui";
import type { QueueItem } from "@/lib/business-client";

type Item = QueueItem & { business: { id: string; name: string; claimed: boolean } | null; submitter: { id: string; email: string; name: string; banned: boolean; createdAt: string } | null };
type Filter = "flagged" | "pending" | "approved" | "rejected" | "all";

export default function ModerationPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<Item[] | null>(null);
  const [counts, setCounts] = useState<{ pending: number; flagged: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = (f: Filter) =>
    fetch(`/api/owner/moderation?status=${f}`)
      .then(async (r) => {
        const j = (await r.json()) as { queue: Item[]; counts: { pending: number; flagged: number }; error?: string };
        if (!r.ok) throw new Error(j.error || "Could not load.");
        setItems(j.queue.map((q) => ({ ...q, author: q.submitter?.name?.split(" ")[0] || "Traveler" })));
        setCounts(j.counts);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load."));

  useEffect(() => {
    void load(filter);
  }, [filter]);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/owner/moderation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(((await r.json()) as { error?: string }).error || "Action failed.");
      await load(filter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Moderation</h1>
        <p className="text-sm text-muted">
          Every customer update lands here. Flagged ones are held until you decide; the rest can also be approved by the business owner. Approving hours or corrections changes the listing; approving reviews, photos, menus and specials makes them visible.
        </p>
      </div>
      {counts && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge tone="tesla">{counts.flagged} held for audit</Badge>
          <Badge tone="paid">{counts.pending} pending in total</Badge>
        </div>
      )}
      <div className="flex gap-1 rounded-lg border border-border bg-surface p-0.5 text-sm">
        {(["pending", "flagged", "approved", "rejected", "all"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 font-medium capitalize ${filter === f ? "bg-navy text-white" : "text-muted hover:text-foreground"}`}>
            {f}
          </button>
        ))}
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      {items && items.length === 0 && <Empty>Nothing to review.</Empty>}
      <ul className="flex flex-col gap-2">
        {items?.map((item) => (
          <SubmissionRow
            key={item.id}
            item={item}
            busy={busy}
            onDecide={(decision) => act({ submissionId: item.id, decision })}
            extra={
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>
                  On{" "}
                  {item.business ? (
                    <Link href={`/app/place/${item.business.id}`} className="font-semibold text-blue hover:underline">{item.business.name}</Link>
                  ) : (
                    "unknown"
                  )}
                  {item.business?.claimed ? " (claimed)" : " (unclaimed)"}
                </span>
                {item.submitter && (
                  <span>
                    · by {item.submitter.email} (joined {new Date(item.submitter.createdAt).toLocaleDateString()}){item.submitter.banned ? " · BANNED" : ""}
                  </span>
                )}
                {item.submitter && !item.submitter.banned && item.submitter.id && (
                  <Button variant="ghost" className="px-2 py-0 text-xs text-coral" disabled={busy} onClick={() => { if (confirm(`Ban ${item.submitter!.email}? Their pending updates are rejected and they can no longer submit.`)) void act({ userId: item.submitter!.id, action: "ban", reason: "Moderation" }); }}>
                    Ban user
                  </Button>
                )}
                {item.submitter?.banned && (
                  <Button variant="ghost" className="px-2 py-0 text-xs" disabled={busy} onClick={() => act({ userId: item.submitter!.id, action: "unban" })}>
                    Unban
                  </Button>
                )}
              </div>
            }
          />
        ))}
      </ul>
    </>
  );
}
