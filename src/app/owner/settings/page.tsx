"use client";

import { useState } from "react";
import { Field, PublishBar, Section, field, useOwnerConsole } from "@/components/OwnerConsole";
import { Badge } from "@/components/ui";
import type { AppSettings } from "@/lib/settings";

export default function OwnerSettingsPage() {
  const c = useOwnerConsole();
  const [app, setApp] = useState<AppSettings["app"] | null>(null);
  const [pricing, setPricing] = useState<AppSettings["pricing"] | null>(null);
  const [price, setPrice] = useState("4.99");
  const [features, setFeatures] = useState("");
  const [biz, setBiz] = useState<AppSettings["business"] | null>(null);
  const [basicPrice, setBasicPrice] = useState("19.99");
  const [sponsorPrice, setSponsorPrice] = useState("49.00");

  // Re-seed the form whenever a fresh console state arrives (initial load, save, publish).
  const [seededFrom, setSeededFrom] = useState<typeof c.state>(null);
  if (c.state && c.state !== seededFrom) {
    setSeededFrom(c.state);
    setApp(c.state.draft.app);
    setPricing(c.state.draft.pricing);
    setPrice((c.state.draft.pricing.monthlyPriceCents / 100).toFixed(2));
    setFeatures(c.state.draft.pricing.features.join("\n"));
    setBiz(c.state.draft.business);
    setBasicPrice((c.state.draft.business.basicPriceCents / 100).toFixed(2));
    setSponsorPrice((c.state.draft.business.sponsorPriceCents / 100).toFixed(2));
  }

  if (!app || !pricing || !biz) return <p className="text-sm text-muted">{c.error ?? "Loading…"}</p>;

  const save = () =>
    c.save({
      app,
      pricing: {
        ...pricing,
        monthlyPriceCents: Math.max(0, Math.round(Number(price || 0) * 100)),
        trialDays: Math.max(0, Math.min(90, Math.round(Number(pricing.trialDays) || 0))),
        features: features.split("\n").map((f) => f.trim()).filter(Boolean),
      },
      business: {
        ...biz,
        basicPriceCents: Math.max(0, Math.round(Number(basicPrice || 0) * 100)),
        sponsorPriceCents: Math.max(0, Math.round(Number(sponsorPrice || 0) * 100)),
        sponsorDays: Math.max(1, Math.min(365, Math.round(Number(biz.sponsorDays) || 30))),
        flagThreshold: Math.max(1, Math.min(20, Math.round(Number(biz.flagThreshold) || 5))),
      },
    });

  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Pricing & app</h1>
        <p className="text-sm text-muted">What subscribers pay and what the landing page says. Save as a draft, then go live.</p>
      </div>

      <Section
        title="Monthly subscription"
        subtitle="Billed through Stripe as a recurring monthly price. Changing the amount creates a new Stripe price when you go live; existing subscribers keep their current price."
        aside={pricing.stripePriceId ? <Badge tone="free">Synced to Stripe: {pricing.stripePriceId}</Badge> : <Badge>Not yet in Stripe</Badge>}
      >
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Price per month</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{pricing.currency === "usd" ? "$" : pricing.currency.toUpperCase()}</span>
            <input className={field} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Currency</span>
          <select className={field} value={pricing.currency} onChange={(e) => setPricing({ ...pricing, currency: e.target.value })}>
            {["usd", "cad", "eur", "gbp", "aud"].map((cur) => (
              <option key={cur} value={cur}>{cur.toUpperCase()}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Free trial (days)</span>
          <input className={field} type="number" min="0" max="90" value={pricing.trialDays} onChange={(e) => setPricing({ ...pricing, trialDays: Number(e.target.value) })} />
          <span className="mt-1 block text-xs text-muted">0 means no trial: the card is charged at signup.</span>
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" className="h-4 w-4" checked={pricing.requireSubscription} onChange={(e) => setPricing({ ...pricing, requireSubscription: e.target.checked })} />
          Require an active subscription to use the app
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">What&apos;s included (one per line, shown on the landing page and checkout)</span>
          <textarea className={field} rows={5} value={features} onChange={(e) => setFeatures(e.target.value)} />
        </label>
      </Section>

      <Section
        title="Business plans"
        subtitle="What businesses pay to claim their listing. Basic is a monthly subscription; Sponsored is a one-time payment for top placement over a set number of days (it includes Basic for that period)."
        aside={biz.stripeBasicPriceId ? <Badge tone="free">Synced to Stripe</Badge> : <Badge>Not yet in Stripe</Badge>}
      >
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Basic monitoring, per month</span>
          <div className="flex items-center gap-2"><span className="text-lg font-bold">$</span><input className={field} type="number" min="0" step="0.01" value={basicPrice} onChange={(e) => setBasicPrice(e.target.value)} /></div>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Sponsored placement, one-time</span>
          <div className="flex items-center gap-2"><span className="text-lg font-bold">$</span><input className={field} type="number" min="0" step="0.01" value={sponsorPrice} onChange={(e) => setSponsorPrice(e.target.value)} /></div>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Sponsored time at the top (days per purchase)</span>
          <input className={field} type="number" min="1" max="365" value={biz.sponsorDays} onChange={(e) => setBiz({ ...biz, sponsorDays: Number(e.target.value) })} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Hold customer updates for your audit at risk score ≥</span>
          <input className={field} type="number" min="1" max="20" value={biz.flagThreshold} onChange={(e) => setBiz({ ...biz, flagThreshold: Number(e.target.value) })} />
          <span className="mt-1 block text-xs text-muted">Lower is stricter. Links, new accounts, rapid-fire posting, abusive language and “closed” hour changes add points.</span>
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" className="h-4 w-4" checked={biz.requirePayment} onChange={(e) => setBiz({ ...biz, requirePayment: e.target.checked })} />
          Require payment to claim a business (when off, or until Stripe is connected, claims are granted free)
        </label>
      </Section>

      <Section title="App & landing page" subtitle="Shown on the public site, in emails and in app store listings.">
        <Field label="App name" value={app.name} onChange={(v) => setApp({ ...app, name: v })} />
        <Field label="Tagline" value={app.tagline} onChange={(v) => setApp({ ...app, tagline: v })} />
        <Field label="Support email" value={app.supportEmail} onChange={(v) => setApp({ ...app, supportEmail: v })} type="email" placeholder="help@routediscover.app" />
        <Field label="Website URL" value={app.websiteUrl} onChange={(v) => setApp({ ...app, websiteUrl: v })} placeholder="https://routediscover.app" hint="Used in share links and emails once you have a domain." />
        <Field label="App Store URL" value={app.appStoreUrl} onChange={(v) => setApp({ ...app, appStoreUrl: v })} placeholder="https://apps.apple.com/app/…" hint="Leave blank to show “Coming soon”." />
        <Field label="Google Play URL" value={app.playStoreUrl} onChange={(v) => setApp({ ...app, playStoreUrl: v })} placeholder="https://play.google.com/store/apps/details?id=…" />
        <Field label="X (Twitter)" value={app.socialX} onChange={(v) => setApp({ ...app, socialX: v })} placeholder="https://x.com/routediscover" />
        <Field label="Facebook" value={app.socialFacebook} onChange={(v) => setApp({ ...app, socialFacebook: v })} placeholder="https://facebook.com/routediscover" />
        <Field label="Instagram" value={app.socialInstagram} onChange={(v) => setApp({ ...app, socialInstagram: v })} placeholder="https://instagram.com/routediscover" />
      </Section>

      <PublishBar c={c} onSave={save} />
    </>
  );
}
