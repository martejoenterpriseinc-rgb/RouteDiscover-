"use client";

import { useState } from "react";
import { Field, PublishBar, Section, field, useOwnerConsole } from "@/components/OwnerConsole";
import { Badge } from "@/components/ui";
import type { AppSettings } from "@/lib/settings";

export default function OwnerSettingsPage() {
  const c = useOwnerConsole();
  const [access, setAccess] = useState<AppSettings["access"] | null>(null);
  const [app, setApp] = useState<AppSettings["app"] | null>(null);
  const [pricing, setPricing] = useState<AppSettings["pricing"] | null>(null);
  const [price, setPrice] = useState("4.99");
  const [features, setFeatures] = useState("");
  const [biz, setBiz] = useState<AppSettings["business"] | null>(null);
  const [ref, setRef] = useState<AppSettings["referrals"] | null>(null);
  const [legal, setLegal] = useState<AppSettings["legal"] | null>(null);
  const [refBonus, setRefBonus] = useState("1.00");
  const [refereeBonus, setRefereeBonus] = useState("0.00");
  const [basicPrice, setBasicPrice] = useState("19.99");
  const [sponsorPrice, setSponsorPrice] = useState("49.00");

  // Re-seed the form whenever a fresh console state arrives (initial load, save, publish).
  const [seededFrom, setSeededFrom] = useState<typeof c.state>(null);
  if (c.state && c.state !== seededFrom) {
    setSeededFrom(c.state);
    setAccess(c.state.draft.access);
    setApp(c.state.draft.app);
    setPricing(c.state.draft.pricing);
    setPrice((c.state.draft.pricing.monthlyPriceCents / 100).toFixed(2));
    setFeatures(c.state.draft.pricing.features.join("\n"));
    setBiz(c.state.draft.business);
    setRef(c.state.draft.referrals);
    setLegal(c.state.draft.legal);
    setRefBonus((c.state.draft.referrals.referrerBonusCents / 100).toFixed(2));
    setRefereeBonus((c.state.draft.referrals.refereeBonusCents / 100).toFixed(2));
    setBasicPrice((c.state.draft.business.basicPriceCents / 100).toFixed(2));
    setSponsorPrice((c.state.draft.business.sponsorPriceCents / 100).toFixed(2));
  }

  if (!access || !app || !pricing || !biz || !ref || !legal) return <p className="text-sm text-muted">{c.error ?? "Loading…"}</p>;

  const save = () =>
    c.save({
      access: { ...access, defaultFreeDays: Math.max(0, Math.min(365, Math.round(Number(access.defaultFreeDays) || 0))) },
      app,
      pricing: {
        ...pricing,
        monthlyPriceCents: Math.max(0, Math.round(Number(price || 0) * 100)),
        trialDays: Math.max(0, Math.min(90, Math.round(Number(pricing.trialDays) || 0))),
        passDays: Math.max(1, Math.min(365, Math.round(Number(pricing.passDays) || 30))),
        features: features.split("\n").map((f) => f.trim()).filter(Boolean),
      },
      legal: { ...legal, updatedAt: new Date().toISOString().slice(0, 10) },
      referrals: {
        ...ref,
        referrerBonusCents: Math.max(0, Math.round(Number(refBonus || 0) * 100)),
        refereeBonusCents: Math.max(0, Math.round(Number(refereeBonus || 0) * 100)),
        qualifyingPayments: Math.max(1, Math.min(24, Math.round(Number(ref.qualifyingPayments) || 1))),
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
        title="Sign-ups"
        subtitle="Control who can create an account. Existing users, including you, can always sign in. Save, then go live for the change to take effect."
        aside={
          <Badge tone={access.mode === "open" ? "free" : access.mode === "approval" ? "blue" : "paid"}>
            {access.mode === "open" ? "Open to everyone" : access.mode === "approval" ? "By approval" : "Closed"}
          </Badge>
        }
      >
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-3">
          {(
            [
              ["open", "Open", "Anyone can create an account. The landing page shows its sign-up buttons."],
              ["approval", "By approval", "Visitors request an account. You approve each one from Users, with or without complimentary days."],
              ["closed", "Closed", "Nobody can sign up. The landing page shows your “coming soon” message instead."],
            ] as const
          ).map(([mode, label, help]) => (
            <label key={mode} className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm ${access.mode === mode ? "border-blue bg-blue/5" : "border-border bg-background"}`}>
              <span className="flex items-center gap-2 font-semibold">
                <input type="radio" name="signup-mode" className="h-4 w-4" checked={access.mode === mode} onChange={() => setAccess({ ...access, mode })} />
                {label}
              </span>
              <span className="text-xs text-muted">{help}</span>
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" className="h-4 w-4" disabled={access.mode === "open"} checked={access.allowInvited} onChange={(e) => setAccess({ ...access, allowInvited: e.target.checked })} />
          While not open, still allow people who arrive through an invite or referral link
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Complimentary days pre-filled when you approve</span>
          <input className={field} type="number" min="0" max="365" value={access.defaultFreeDays} onChange={(e) => setAccess({ ...access, defaultFreeDays: Number(e.target.value) })} />
          <span className="mt-1 block text-xs text-muted">0 means approved people pay like everyone else. You can change it per person when approving.</span>
        </label>
        <Field label="Request form headline (by approval)" value={access.requestTitle} onChange={(v) => setAccess({ ...access, requestTitle: v })} />
        <Field label="Request form message (by approval)" value={access.requestMessage} onChange={(v) => setAccess({ ...access, requestMessage: v })} wide />
        <Field label="Headline shown while closed" value={access.closedTitle} onChange={(v) => setAccess({ ...access, closedTitle: v })} />
        <Field label="Message shown while closed" value={access.closedMessage} onChange={(v) => setAccess({ ...access, closedMessage: v })} wide />
      </Section>

      <Section
        title="Traveler pricing"
        subtitle="A one-time pass (nothing renews) or a monthly subscription. Changing the amount or model creates a new Stripe price when you go live."
        aside={pricing.stripePriceId ? <Badge tone="free">Synced to Stripe: {pricing.stripePriceId}</Badge> : <Badge>Not yet in Stripe</Badge>}
      >
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Pricing model</span>
          <select className={field} value={pricing.model} onChange={(e) => setPricing({ ...pricing, model: e.target.value as "pass" | "subscription" })}>
            <option value="pass">One-time pass (pay once for a number of days)</option>
            <option value="subscription">Monthly subscription (renews)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{pricing.model === "pass" ? "Price per pass" : "Price per month"}</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{pricing.currency === "usd" ? "$" : pricing.currency.toUpperCase()}</span>
            <input className={field} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </label>
        {pricing.model === "pass" && (
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Days per pass</span>
            <input className={field} type="number" min="1" max="365" value={pricing.passDays} onChange={(e) => setPricing({ ...pricing, passDays: Number(e.target.value) })} />
          </label>
        )}
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Currency</span>
          <select className={field} value={pricing.currency} onChange={(e) => setPricing({ ...pricing, currency: e.target.value })}>
            {["usd", "cad", "eur", "gbp", "aud"].map((cur) => (
              <option key={cur} value={cur}>{cur.toUpperCase()}</option>
            ))}
          </select>
        </label>
        <div className="rounded-xl border border-border bg-background p-3 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="h-4 w-4" checked={pricing.trialEnabled} onChange={(e) => setPricing({ ...pricing, trialEnabled: e.target.checked })} />
            Free trial period {pricing.trialEnabled ? "on" : "off"}
          </label>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-muted">Length</span>
            <input className={`${field} w-24`} type="number" min="0" max="90" disabled={!pricing.trialEnabled} value={pricing.trialDays} onChange={(e) => setPricing({ ...pricing, trialDays: Number(e.target.value) })} />
            <span className="text-muted">days. {pricing.model === "pass" ? "New accounts get this many free days before they need a pass." : "Applied at the first checkout."}</span>
          </div>
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" className="h-4 w-4" checked={pricing.requireSubscription} onChange={(e) => setPricing({ ...pricing, requireSubscription: e.target.checked })} />
          Require a pass / subscription to use the app
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">What&apos;s included (one per line, shown on the landing page and checkout)</span>
          <textarea className={field} rows={5} value={features} onChange={(e) => setFeatures(e.target.value)} />
        </label>
      </Section>

      <Section
        title="Referral program"
        subtitle="Paid users share their link. When a friend joins and pays for the qualifying number of periods, both sides can receive credit that applies at their next checkout. Edit these any time to run a promotion."
        aside={<label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4" checked={ref.enabled} onChange={(e) => setRef({ ...ref, enabled: e.target.checked })} />Program {ref.enabled ? "on" : "off"}</label>}
      >
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Referrer bonus (credit)</span>
          <div className="flex items-center gap-2"><span className="text-lg font-bold">$</span><input className={field} type="number" min="0" step="0.01" value={refBonus} onChange={(e) => setRefBonus(e.target.value)} /></div>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">New customer bonus (credit, 0 for none)</span>
          <div className="flex items-center gap-2"><span className="text-lg font-bold">$</span><input className={field} type="number" min="0" step="0.01" value={refereeBonus} onChange={(e) => setRefereeBonus(e.target.value)} /></div>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Friend must pay for this many {pricing.model === "pass" ? "passes" : "months"}</span>
          <input className={field} type="number" min="1" max="24" value={ref.qualifyingPayments} onChange={(e) => setRef({ ...ref, qualifyingPayments: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" className="h-4 w-4" checked={ref.referrerMustBePaid} onChange={(e) => setRef({ ...ref, referrerMustBePaid: e.target.checked })} />
          Only paid users can share a referral link
        </label>
        <Field label="Promotion title" value={ref.promoTitle} onChange={(v) => setRef({ ...ref, promoTitle: v })} />
        <Field label="Promotion text (shown to users)" value={ref.promoText} onChange={(v) => setRef({ ...ref, promoText: v })} wide />
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

      <Section title="Terms & privacy" subtitle="Shown at /terms and /privacy, linked from sign-up, the landing page and accounts. Markdown: # heading, ## subheading, - bullets, **bold**, [links](https://…). The “last updated” date is set when you save. Have a lawyer review before launch.">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Terms of Service</span>
          <textarea className={`${field} font-mono text-xs`} rows={12} value={legal.termsMarkdown} onChange={(e) => setLegal({ ...legal, termsMarkdown: e.target.value })} />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Privacy Policy</span>
          <textarea className={`${field} font-mono text-xs`} rows={12} value={legal.privacyMarkdown} onChange={(e) => setLegal({ ...legal, privacyMarkdown: e.target.value })} />
        </label>
      </Section>

      <PublishBar c={c} onSave={save} />
    </>
  );
}
