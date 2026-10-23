"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatTile } from "@/components/Charts";
import { Badge, Button, Empty, ErrorNote } from "@/components/ui";

type Row = {
  id: string;
  name: string;
  address?: string;
  category: string;
  claimStatus: "unclaimed" | "claimed" | "revoked";
  claimedAt: string | null;
  claimant: { id: string; email: string; name: string } | null;
  tier: "sponsor" | "basic" | "lapsed" | "none";
  sponsorUntil: string | null;
  paid: boolean;
  revenueCents: number;
  plans: Array<{ id: string; plan: string; status: string; amountCents: number; stripeRef: string | null; startsAt: string | null; endsAt: string | null }>;
};
type Totals = { listings: number; claimed: number; basic: number; sponsors: number; revenueCents: number };
const money = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

export default function OwnerBusinessesPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"claimed" | "sponsor" | "basic" | "all">("claimed");

  const load = () =>
    fetch("/api/owner/businesses")
      .then(async (r) => {
        const j = (await r.json()) as { businesses: Row[]; totals: Totals; error?: string };
        if (!r.ok) throw new Error(j.error || "Could not load.");
        setRows(j.businesses);
        setTotals(j.totals);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load."));
  useEffect(() => {
    void load();
  }, []);

  const visible = (rows ?? []).filter((r) => (filter === "all" ? true : filter === "claimed" ? r.claimStatus === "claimed" : r.tier === filter));
  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Businesses</h1>
        <p className="text-sm text-muted">Who has claimed a listing, which plan they&apos;re on, and what they&apos;ve paid.</p>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      {totals && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Claimed" value={totals.claimed} sub={`of ${totals.listings} listings travelers have opened`} />
          <StatTile label="Sponsors (active)" value={totals.sponsors} sub="paid for top placement" accent />
          <StatTile label="Basic monitoring" value={totals.basic} sub="monthly subscribers" />
          <StatTile label="Business revenue" value={money(totals.revenueCents)} sub="all time" />
        </div>
      )}
      <div className="flex gap-1 rounded-lg border border-border bg-surface p-0.5 text-sm">
        {(["claimed", "sponsor", "basic", "all"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 font-medium capitalize ${filter === f ? "bg-navy text-white" : "text-muted hover:text-foreground"}`}>
            {f === "all" ? "All listings" : f === "claimed" ? "Claimed" : f === "sponsor" ? "Sponsors" : "Basic"}
          </button>
        ))}
      </div>
      {rows && visible.length === 0 && <Empty>Nothing here yet.</Empty>}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Business</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Claimed by</th>
              <th className="px-3 py-2">Paid</th>
              <th className="px-3 py-2">Revenue</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-2">
                  <Link href={`/app/place/${r.id}`} className="font-semibold hover:underline">{r.name}</Link>
                  <div className="text-xs text-muted">{r.address}</div>
                </td>
                <td className="px-3 py-2">
                  {r.tier === "sponsor" ? <Badge tone="paid">★ Sponsor until {new Date(r.sponsorUntil!).toLocaleDateString()}</Badge> : r.tier === "basic" ? <Badge tone="blue">Basic monitoring</Badge> : r.tier === "lapsed" ? <Badge>Claimed, no active plan</Badge> : <Badge>Unclaimed</Badge>}
                  {r.claimStatus === "revoked" && <Badge tone="tesla">Revoked</Badge>}
                  <div className="mt-1 text-xs text-muted">
                    {r.plans.map((p) => (
                      <div key={p.id}>{p.plan} · {p.status} · {money(p.amountCents)} · {p.stripeRef === "manual" ? "granted free" : (p.stripeRef ?? "").slice(0, 18)}</div>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {r.claimant ? (
                    <>
                      <div>{r.claimant.name}</div>
                      <div className="text-xs text-muted">{r.claimant.email}</div>
                      {r.claimedAt && <div className="text-xs text-muted">{new Date(r.claimedAt).toLocaleDateString()}</div>}
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2">{r.paid ? <Badge tone="free">Paid via Stripe</Badge> : r.claimStatus === "claimed" ? <Badge>No payment</Badge> : "—"}</td>
                <td className="px-3 py-2">{money(r.revenueCents)}</td>
                <td className="px-3 py-2">
                  {r.claimStatus === "claimed" && (
                    <Button
                      variant="ghost"
                      className="text-coral"
                      onClick={async () => {
                        if (!confirm(`Revoke the claim on ${r.name}? The claimant loses edit access and sponsorship.`)) return;
                        await fetch("/api/owner/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId: r.id, action: "revoke" }) });
                        await load();
                      }}
                    >
                      Revoke
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
