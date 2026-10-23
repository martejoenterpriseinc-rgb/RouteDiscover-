"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatTile } from "@/components/Charts";
import { ShareButtons } from "@/components/ShareButtons";
import { Badge, Empty, ErrorNote } from "@/components/ui";
import type { ReferralSummary } from "@/lib/referrals";

type Data = {
  program: { enabled: boolean; referrerBonusCents: number; refereeBonusCents: number; qualifyingPayments: number; referrerMustBePaid: boolean; promoTitle: string; promoText: string; currency: string; model: "pass" | "subscription"; passDays: number; priceCents: number };
  eligible: boolean;
  paid: boolean;
  link: string;
  code: string;
  summary: ReferralSummary;
};
const money = (c: number, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur.toUpperCase() }).format(c / 100);

export default function ReferralsPage() {
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/referrals")
      .then(async (r) => {
        const j = (await r.json()) as Data & { error?: string };
        if (!r.ok) throw new Error(j.error || "Could not load.");
        setD(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load."));
  }, []);
  if (error) return <div className="p-4"><ErrorNote>{error}</ErrorNote></div>;
  if (!d) return <p className="p-4 text-sm text-muted">Loading…</p>;
  const { program: p, summary: s } = d;
  const period = p.model === "pass" ? `${p.passDays}-day pass${p.qualifyingPayments === 1 ? "" : "es"}` : "month" + (p.qualifyingPayments === 1 ? "" : "s");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">🎁 Refer friends, earn credit</h1>
        <p className="text-sm text-muted">{p.promoText}</p>
      </div>
      {!p.enabled && <ErrorNote>The referral program is paused right now. Your link still works for inviting friends.</ErrorNote>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Available credit" value={money(s.availableCents, p.currency)} sub="applied automatically at your next checkout" accent />
        <StatTile label="Friends joined" value={s.friendsJoined} sub={`${s.friendsPaid} have paid`} />
        <StatTile label="Qualified" value={s.friendsQualified} sub={`paid for ${p.qualifyingPayments} ${period}`} />
        <StatTile label="Earned so far" value={money(s.earnedCents, p.currency)} sub={`${money(s.appliedCents, p.currency)} already used`} />
      </div>

      <section className="rounded-2xl border border-orange/50 bg-cream p-4">
        <h2 className="font-bold">{p.promoTitle}</h2>
        <ul className="mt-1 space-y-1 text-sm">
          <li>1. Share your link on Facebook, X, WhatsApp, or by text and email.</li>
          <li>2. A friend joins through it and buys {p.qualifyingPayments} {period}.</li>
          <li>3. You get {money(p.referrerBonusCents, p.currency)} credit{p.refereeBonusCents > 0 ? ` and they get ${money(p.refereeBonusCents, p.currency)}` : ""}, applied to your next {p.model === "pass" ? "pass" : "payment"}. No limit on friends.</li>
        </ul>
        <div className="mt-3">
          {d.eligible ? (
            <ShareButtons url={d.link} title="Join me on RouteDiscover" text={`I'm using RouteDiscover to find great stops, chargers and hotels on road trips. Get a ${p.passDays}-day pass:`} onShared={() => fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "trip_shared", meta: { channel: "referral" } }) })} />
          ) : (
            <p className="text-sm">
              Your referral link unlocks after your first {p.model === "pass" ? "pass" : "payment"}.{" "}
              <Link href="/app/subscribe" className="font-semibold text-blue hover:underline">Get your pass →</Link>
            </p>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">Your code: {d.code}</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-bold">Friends</h2>
          {s.friends.length === 0 ? <div className="mt-2"><Empty>No one has joined through your link yet.</Empty></div> : (
            <ul className="mt-2 divide-y divide-border text-sm">
              {s.friends.map((f, i) => (
                <li key={i} className="flex items-center justify-between py-1.5">
                  <span>{f.name} <span className="text-xs text-muted">joined {new Date(f.joinedAt).toLocaleDateString()}</span></span>
                  {f.qualifiedAt ? <Badge tone="free">Qualified</Badge> : f.paidPeriods > 0 ? <Badge tone="blue">{f.paidPeriods} of {p.qualifyingPayments} paid</Badge> : <Badge>Joined</Badge>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-bold">Credit history</h2>
          {s.credits.length === 0 ? <div className="mt-2"><Empty>Credits show up here when a friend qualifies.</Empty></div> : (
            <ul className="mt-2 divide-y divide-border text-sm">
              {s.credits.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-1.5">
                  <span>
                    {money(c.amountCents, p.currency)} <span className="text-xs text-muted">{c.note ?? c.reason} · {new Date(c.createdAt).toLocaleDateString()}</span>
                  </span>
                  <Badge tone={c.status === "applied" ? "neutral" : "free"}>{c.status === "applied" ? "used" : c.status === "pending" ? "applying" : "available"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
