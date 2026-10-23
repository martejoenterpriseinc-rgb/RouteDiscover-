"use client";

import { useEffect, useState } from "react";
import { StatTile } from "@/components/Charts";
import { Badge, Empty, ErrorNote } from "@/components/ui";
import type { ReferralProgramStats } from "@/lib/referrals";

type Data = { days: number; currency: string; program: { enabled: boolean; referrerBonusCents: number; refereeBonusCents: number; qualifyingPayments: number; referrerMustBePaid: boolean; promoTitle: string }; stats: ReferralProgramStats };
const money = (c: number, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur.toUpperCase() }).format(c / 100);

export default function OwnerReferralsPage() {
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/owner/referrals")
      .then(async (r) => {
        const j = (await r.json()) as Data & { error?: string };
        if (!r.ok) throw new Error(j.error || "Could not load.");
        setD(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load."));
  }, []);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!d) return <p className="text-sm text-muted">Loading…</p>;
  const { stats: s, program: p } = d;
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Referral program</h1>
          <p className="text-sm text-muted">{p.promoTitle} · {money(p.referrerBonusCents, d.currency)} per friend after {p.qualifyingPayments} paid period{p.qualifyingPayments === 1 ? "" : "s"}{p.refereeBonusCents > 0 ? ` · ${money(p.refereeBonusCents, d.currency)} to the new customer` : ""}</p>
        </div>
        <Badge tone={p.enabled ? "free" : "paid"}>{p.enabled ? "Program on" : "Program paused"}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Referred signups" value={s.referredSignups} sub={`+${s.referredSignupsInRange} in the last ${d.days} days`} />
        <StatTile label="Referred → paid" value={`${s.conversionPct}%`} sub={`${s.referredPaid} of ${s.referredSignups} paid at least once`} accent />
        <StatTile label="Qualified referrals" value={s.qualified} sub={`+${s.qualifiedInRange} in ${d.days}d · ${s.activeReferrers} referrers`} />
        <StatTile label="Credits issued" value={money(s.creditsIssuedCents, d.currency)} sub={`${money(s.creditsRedeemedCents, d.currency)} redeemed · ${money(s.creditsOutstandingCents, d.currency)} outstanding`} />
      </div>
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-bold">Top referrers</h2>
        {s.topReferrers.length === 0 ? <div className="mt-2"><Empty>No referrals yet. Users find their link under Account → Refer friends.</Empty></div> : (
          <table className="mt-2 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="py-1">Referrer</th><th className="py-1">Joined</th><th className="py-1">Paid</th><th className="py-1">Qualified</th><th className="py-1">Earned</th></tr>
            </thead>
            <tbody>
              {s.topReferrers.map((r) => (
                <tr key={r.userId} className="border-t border-border">
                  <td className="py-1.5">{r.name || "—"}<div className="text-xs text-muted">{r.email}</div></td>
                  <td className="py-1.5">{r.joined}</td>
                  <td className="py-1.5">{r.paid}</td>
                  <td className="py-1.5">{r.qualified}</td>
                  <td className="py-1.5">{money(r.earnedCents, d.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <p className="text-xs text-muted">Change the bonus, qualifying periods, or pause the program under Pricing & app, then Go live. Changes apply to referrals that qualify from then on.</p>
    </>
  );
}
