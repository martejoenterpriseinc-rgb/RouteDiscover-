"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, ErrorNote } from "@/components/ui";
import { claimBusiness, getListing, money } from "@/lib/listing-client";
import type { ListingView } from "@/lib/listing-view";

const BASIC = ["Edit everything travelers see: name, address, hours, phone, website, description", "Post your menu, specials and photos", "Sync button to refresh from online sources any time", "Traffic: views, map and website clicks, trip adds", "Approve or reject customer updates in your queue"];

export default function ClaimPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [view, setView] = useState<ListingView | null>(null);
  const [plan, setPlan] = useState<"basic" | "sponsor">("sponsor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getListing(id).then(setView).catch((e) => setError(e instanceof Error ? e.message : "Could not load."));
  }, [id]);

  if (error) return <div className="p-4"><ErrorNote>{error}</ErrorNote></div>;
  if (!view) return <p className="p-4 text-sm text-muted">Loading…</p>;
  const { business: b, pricing } = view;

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const r = await claimBusiness(id, plan);
      if (r.url) {
        window.location.href = r.url;
        return;
      }
      router.push(`/app/business/${id}${r.notice ? `?notice=${encodeURIComponent(r.notice)}` : ""}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the claim.");
      setBusy(false);
    }
  }

  const card = (p: "basic" | "sponsor", title: string, price: string, sub: string, items: string[], highlight?: boolean) => (
    <button
      type="button"
      onClick={() => setPlan(p)}
      className={`flex flex-col rounded-2xl border-2 p-5 text-left transition ${plan === p ? "border-orange bg-cream shadow-lg" : "border-border bg-surface hover:border-blue"}`}
      aria-pressed={plan === p}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        {highlight && <Badge tone="paid">Most visible</Badge>}
      </div>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">{price}</p>
      <p className="text-xs text-muted">{sub}</p>
      <ul className="mt-3 space-y-1 text-sm">
        {items.map((i) => (
          <li key={i} className="flex gap-2"><span className="text-green" aria-hidden>✔</span>{i}</li>
        ))}
      </ul>
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <Link href={`/app/place/${id}`} className="text-sm text-blue hover:underline">← Back to listing</Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Claim {b.name}</h1>
      <p className="text-sm text-muted">{b.address}</p>
      <p className="mt-3 text-sm">
        Thousands of RouteDiscover travelers plan trips past your door. Claim your listing to control what they see and get your business in front of them.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {card("basic", "Basic monitoring", `${money(pricing.basicPriceCents, pricing.currency)}/mo`, "Billed monthly, cancel anytime", BASIC)}
        {card("sponsor", "Sponsored placement", money(pricing.sponsorPriceCents, pricing.currency), `${pricing.sponsorDays} days at the top of results, plus everything in Basic for that period`, [`Shown first, marked “Sponsored”, in every search that includes you for ${pricing.sponsorDays} days`, "Everything in Basic monitoring", "Buy again any time to extend"], true)}
      </div>
      {!pricing.paymentRequired && (
        <p className="mt-3 rounded-lg border border-orange/50 bg-cream px-3 py-2 text-xs">Billing isn&apos;t connected yet, so claims are granted immediately without payment.</p>
      )}
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={go} disabled={busy}>{busy ? "One moment…" : pricing.paymentRequired ? "Continue to secure checkout" : "Claim this business"}</Button>
        <span className="text-xs text-muted">Payments by Stripe. You&apos;ll manage the listing from your account.</span>
      </div>
    </div>
  );
}
