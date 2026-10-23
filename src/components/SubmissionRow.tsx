"use client";

import { Badge, Button } from "./ui";
import { TYPE_LABEL, describe, type QueueItem } from "@/lib/business-client";

export function SubmissionRow({ item, onDecide, extra, busy }: { item: QueueItem; onDecide?: (decision: "approved" | "rejected") => void; extra?: React.ReactNode; busy?: boolean }) {
  return (
    <li className={`rounded-xl border p-3 ${item.flagged ? "border-coral/60 bg-coral/5" : "border-border bg-surface"}`}>
      <div className="flex flex-wrap items-center gap-1">
        <Badge tone="blue">{TYPE_LABEL[item.type]}</Badge>
        {item.flagged && <Badge tone="tesla">⚠ Held for audit</Badge>}
        {item.status !== "pending" && <Badge tone={item.status === "approved" ? "free" : "paid"}>{item.status}</Badge>}
        <span className="ml-auto text-xs text-muted">{item.author} · {new Date(item.createdAt).toLocaleString()}</span>
      </div>
      {item.type === "photo" && item.payload.photoId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/photos/${item.payload.photoId}`} alt={item.payload.caption ?? "Submitted photo"} className="mt-2 max-h-40 rounded-lg object-cover" />
      )}
      <p className="mt-1 whitespace-pre-wrap text-sm">{describe(item)}</p>
      {item.riskFlags.length > 0 && (
        <p className="mt-1 text-xs text-muted">Risk {item.riskScore}: {item.riskFlags.join(", ")}</p>
      )}
      {extra}
      {onDecide && item.status === "pending" && (
        <div className="mt-2 flex gap-2">
          <Button className="px-3 py-1 text-xs" disabled={busy} onClick={() => onDecide("approved")}>✓ Approve</Button>
          <Button variant="secondary" className="px-3 py-1 text-xs" disabled={busy} onClick={() => onDecide("rejected")}>✕ Reject</Button>
        </div>
      )}
    </li>
  );
}
