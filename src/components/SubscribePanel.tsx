"use client";

import Link from "next/link";
import { useState } from "react";
import type { Access } from "@/lib/billing";
import { Badge, Button, ErrorNote } from "./ui";

export function SubscribePanel({ access }: { access: Access }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(path: "checkout" | "portal") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/billing/${path}`, { method: "POST" });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !j.url) throw new Error(j.error || "Billing is unavailable right now.");
      window.location.href = j.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Billing is unavailable right now.");
      setBusy(false);
    }
  }

  const active = access.allowed && access.status !== "none";
  const isPass = access.model === "pass";
  return (
    <div className="mt-6 flex flex-col gap-3">
      {access.status !== "none" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Status:</span>
          <Badge tone={active ? "free" : "paid"}>{access.kind === "trial" ? "free trial" : access.kind === "pass" ? (access.allowed ? "pass active" : "pass ended") : access.status.replace("_", " ")}</Badge>
          {access.currentPeriodEnd && (
            <span className="text-muted">
              {access.kind === "subscription" ? "renews" : access.allowed ? `${access.daysLeft} day${access.daysLeft === 1 ? "" : "s"} left, ends` : "ended"} {new Date(access.currentPeriodEnd).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      {isPass ? (
        <Button onClick={() => go("checkout")} disabled={busy}>
          {busy ? "Opening secure checkout…" : active ? `Extend by ${access.passDays} days` : `Buy ${access.passDays}-day pass`}
        </Button>
      ) : active && access.kind === "subscription" ? (
        <Button variant="secondary" onClick={() => go("portal")} disabled={busy}>
          {busy ? "Opening…" : "Manage or cancel subscription"}
        </Button>
      ) : (
        <Button onClick={() => go("checkout")} disabled={busy}>
          {busy ? "Opening secure checkout…" : access.trialEnabled && access.trialDays > 0 && access.status === "none" ? `Start ${access.trialDays}-day free trial` : "Subscribe"}
        </Button>
      )}
      {active && (
        <Link href="/app" className="text-center text-sm font-semibold text-blue hover:underline">
          Back to the app →
        </Link>
      )}
      <p className="text-center text-xs text-muted">Payments are handled securely by Stripe.</p>
    </div>
  );
}
