"use client";

import Link from "next/link";
import { BarList, LineChart, StatTile, compact } from "./Charts";
import { DataSourcesCard } from "./DataSourcesCard";
import { Badge } from "./ui";
import type { OwnerStats } from "@/lib/stats";

const money = (cents: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

const EVENT_LABEL: Record<string, string> = {
  signup: "New account",
  subscription_started: "Subscription started",
  subscription_canceled: "Subscription canceled",
  subscription_payment_failed: "Payment failed",
  trip_created: "Trip planned",
  trip_shared: "Trip shared",
  invite_sent: "Invite sent",
  download_click: "Store badge clicked",
  pwa_installed: "Installed to home screen",
  settings_published: "Settings went live",
  business_claimed: "Business claimed",
  sponsor_purchased: "Sponsorship purchased",
  submission_created: "Customer update submitted",
  user_banned: "User banned",
  pass_purchased: "Pass purchased",
  referral_rewarded: "Referral bonus issued",
  trial_started: "Free trial started",
};

export function OwnerDashboard({ stats }: { stats: OwnerStats }) {
  const s = stats;
  const r = s.rangeDays;
  const setupItems = [
    { ok: s.setup.signupsOpen, label: s.setup.signupsOpen ? "Sign-ups open to the public" : "Sign-ups closed (open them when you're ready to launch)", href: "/owner/settings" },
    { ok: s.setup.stripeConnected, label: "Stripe connected", href: "/owner/integrations" },
    { ok: s.setup.priceSynced, label: s.passes.model === "pass" ? "Pass price synced to Stripe" : "Monthly price synced to Stripe", href: "/owner/settings" },
    { ok: s.setup.webhookSecret, label: "Stripe webhook secret saved", href: "/owner/integrations" },
    { ok: s.setup.storeLinks, label: "App Store / Google Play links", href: "/owner/settings" },
    { ok: s.setup.emailConnected, label: "Email provider for invites", href: "/owner/integrations" },
  ];
  const done = setupItems.filter((i) => i.ok).length;

  return (
    <div className="flex flex-col gap-4">
      {done < setupItems.length && (
        <div className="rounded-2xl border border-orange/50 bg-cream p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Launch checklist</h2>
            <span className="text-sm text-muted">{done} of {setupItems.length} done</span>
          </div>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {setupItems.map((i) => (
              <li key={i.label} className="text-sm">
                <Link href={i.href} className="flex items-center gap-2 hover:underline">
                  <span aria-hidden className={i.ok ? "text-green" : "text-muted"}>{i.ok ? "✔" : "○"}</span>
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
          {!s.setup.stripeConnected && s.setup.requireSubscription && (
            <p className="mt-2 text-xs text-muted">Until Stripe is connected, everyone gets free access even though subscriptions are required.</p>
          )}
        </div>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Revenue</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {s.passes.model === "pass" ? (
            <StatTile label="Pass revenue" value={money(s.passes.revenueCents, s.subscriptions.currency)} sub={`${money(s.passes.revenueInRangeCents, s.subscriptions.currency)} in the last ${r} days · ${s.passes.sold} passes sold`} accent />
          ) : (
            <StatTile label="Monthly recurring revenue" value={money(s.subscriptions.mrrCents, s.subscriptions.currency)} sub={`${s.subscriptions.active + s.subscriptions.pastDue} paying × ${money(s.subscriptions.priceCents, s.subscriptions.currency)}`} accent />
          )}
          <StatTile label={s.passes.model === "pass" ? "Active passes" : "Active subscribers"} value={s.subscriptions.active} sub={`${s.subscriptions.trialing} on free trial · ${s.subscriptions.pastDue} past due`} />
          <StatTile label="Canceled" value={s.subscriptions.canceled} sub={`${s.subscriptions.cancelingAtPeriodEnd} set to cancel at period end`} />
          <StatTile label="Churn (30 days)" value={`${s.subscriptions.churnRatePct}%`} sub={`${s.subscriptions.conversionPct}% of accounts have ever paid`} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Users</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Total accounts" value={s.users.total} sub={`+${s.users.newInRange} in the last ${r} days`} trend={s.series.signups} />
          <StatTile label="Signed up (7 days)" value={s.users.new7d} />
          <StatTile label="Active today" value={s.users.active1d} sub={`${s.users.active7d} this week · ${s.users.active30d} this month`} />
          <StatTile label="Logins" value={s.engagement.logins} sub={`last ${r} days`} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Downloads & acquisition</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="App Store clicks" value={s.acquisition.storeClicksIos} sub="Badge clicks on the landing page" />
          <StatTile label="Google Play clicks" value={s.acquisition.storeClicksAndroid} sub="Badge clicks on the landing page" />
          <StatTile label="Installed to home screen" value={s.acquisition.pwaInstalled} sub={`${s.acquisition.pwaInstallClicks} install prompts`} />
          <StatTile label="Landing visitors" value={s.acquisition.landingVisitors} sub={`${compact(s.acquisition.landingViews)} views · ${s.acquisition.visitorToSignupPct}% signed up`} trend={s.series.landingViews} />
        </div>
        <p className="mt-2 text-xs text-muted">
          Store downloads themselves are reported by App Store Connect and Google Play Console; connect those under Integrations → Custom APIs once the native apps ship.
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Referral program</h2>
          <Link href="/owner/referrals" className="text-xs font-semibold text-blue hover:underline">Referral details →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Referred signups" value={s.referrals.referredSignups} sub={`+${s.referrals.referredSignupsInRange} in ${r}d · ${s.referrals.activeReferrers} people sharing`} />
          <StatTile label="Referred → paid" value={`${s.referrals.conversionPct}%`} sub={`${s.referrals.referredPaid} paid at least once`} accent />
          <StatTile label="Qualified referrals" value={s.referrals.qualified} sub={`+${s.referrals.qualifiedInRange} in ${r}d`} />
          <StatTile label="Credits issued" value={money(s.referrals.creditsIssuedCents, s.subscriptions.currency)} sub={`${money(s.referrals.creditsRedeemedCents, s.subscriptions.currency)} redeemed · ${money(s.referrals.creditsOutstandingCents, s.subscriptions.currency)} outstanding`} />
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Businesses</h2>
          <div className="flex gap-3 text-xs font-semibold">
            <Link href="/owner/businesses" className="text-blue hover:underline">All businesses →</Link>
            <Link href="/owner/moderation" className="text-blue hover:underline">Moderation queue →</Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Business revenue" value={money(s.businesses.revenueCents, s.subscriptions.currency)} sub={`${money(s.businesses.revenueInRangeCents, s.subscriptions.currency)} in the last ${r} days`} accent />
          <StatTile label="Claimed businesses" value={s.businesses.claimed} sub={`+${s.businesses.claimedInRange} in ${r}d · ${s.businesses.listings} listings viewed`} />
          <StatTile label="Sponsors (active)" value={s.businesses.sponsors} sub={`${s.businesses.basic} on Basic monitoring`} />
          <StatTile label="Updates awaiting review" value={s.businesses.pendingSubmissions} sub={`${s.businesses.flaggedSubmissions} held for your audit · ${s.businesses.approvedInRange} approved / ${s.businesses.rejectedInRange} rejected in ${r}d`} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <LineChart title={`Signups vs. landing visitors (last ${r} days)`} series={[{ name: "Signups", points: s.series.signups }, { name: "Landing views", points: s.series.landingViews }]} />
        <LineChart title={`Subscriptions started vs. store clicks (last ${r} days)`} series={[{ name: "Subscriptions", points: s.series.subscriptionsStarted }, { name: "Store clicks", points: s.series.downloads }]} />
      </div>

      <DataSourcesCard />

      <div className="grid gap-4 lg:grid-cols-2">
        <BarList
          title="Engagement"
          rows={[
            { label: "Trips planned", value: s.engagement.trips, note: `+${s.engagement.tripsInRange} in ${r}d` },
            { label: "Trips completed", value: s.engagement.tripsCompleted },
            { label: "Stops saved", value: s.engagement.stops },
            { label: "Trips with public link", value: s.engagement.tripsShared },
            { label: "Share actions", value: s.engagement.shares },
            { label: "Invites sent", value: s.acquisition.invitesSent, note: `${s.acquisition.invitesAccepted} accepted` },
            { label: "Referred signups", value: s.acquisition.referredSignups },
          ]}
        />
        <figure className="rounded-2xl border border-border bg-surface p-4">
          <figcaption className="font-semibold">Recent activity</figcaption>
          {s.recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing yet. Activity shows up here as people sign up, subscribe, plan and share trips.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border text-sm">
              {s.recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="min-w-0 truncate">
                    <Badge tone={e.type.includes("canceled") || e.type.includes("failed") ? "paid" : e.type.includes("subscription") ? "free" : "neutral"}>{EVENT_LABEL[e.type] ?? e.type}</Badge>
                    <span className="ml-2 text-muted">{e.userEmail ?? (e.meta.platform ? String(e.meta.platform) : "visitor")}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{new Date(e.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </figure>
      </div>
      <p className="text-right text-xs text-muted">Updated {new Date(s.generatedAt).toLocaleString()}</p>
    </div>
  );
}
