"use client";

import { useState, useSyncExternalStore } from "react";
import { Field, PublishBar, Section, TestButton, field, useOwnerConsole } from "@/components/OwnerConsole";
import { Badge, Button } from "@/components/ui";
import { DataSourcesCard } from "@/components/DataSourcesCard";
import type { AppSettings, CustomApi } from "@/lib/settings";

type I = AppSettings["integrations"];

export default function OwnerIntegrationsPage() {
  const c = useOwnerConsole();
  const [i, setI] = useState<I | null>(null);
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );

  // Re-seed the form whenever a fresh console state arrives (initial load, save, publish).
  const [seededFrom, setSeededFrom] = useState<typeof c.state>(null);
  if (c.state && c.state !== seededFrom) {
    setSeededFrom(c.state);
    setI(c.state.draft.integrations);
  }

  if (!i) return <p className="text-sm text-muted">{c.error ?? "Loading…"}</p>;
  const env = c.state!.envFallbacks;
  const set = <K extends keyof I>(k: K, v: Partial<I[K]>) => setI({ ...i, [k]: { ...(i[k] as object), ...(v as object) } as I[K] });
  const save = () => c.save({ integrations: i });
  const addCustom = () =>
    setI({ ...i, custom: [...i.custom, { id: crypto.randomUUID(), name: "", baseUrl: "", authHeader: "Authorization", authValue: "", notes: "", enabled: true }] });
  const setCustom = (id: string, patch: Partial<CustomApi>) => setI({ ...i, custom: i.custom.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const removeCustom = (id: string) => setI({ ...i, custom: i.custom.filter((x) => x.id !== id) });

  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted">
          Plug in every service the app talks to. Keys are encrypted at rest and never shown again in full. “Test connection” checks the draft values; “Go live” switches the app over.
        </p>
      </div>

      <DataSourcesCard compact />

      <Section
        title="Stripe (billing)"
        subtitle="Recurring monthly subscriptions, free trials, customer portal and cancellations."
        aside={<div className="flex items-center gap-2">{env.stripe && !i.stripe.secretKey && <Badge tone="blue">Using server env key</Badge>}<TestButton target="stripe" /></div>}
      >
        <Field label="Secret key" value={i.stripe.secretKey} onChange={(v) => set("stripe", { secretKey: v })} secret placeholder="sk_live_… or sk_test_…" />
        <Field label="Publishable key" value={i.stripe.publishableKey} onChange={(v) => set("stripe", { publishableKey: v })} placeholder="pk_live_…" />
        <Field label="Webhook signing secret" value={i.stripe.webhookSecret} onChange={(v) => set("stripe", { webhookSecret: v })} secret placeholder="whsec_…" hint="From Stripe → Developers → Webhooks after adding the endpoint below." />
        <div className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Webhook endpoint to add in Stripe</span>
          <code className="block rounded-lg bg-background px-3 py-2 text-xs">{origin}/api/billing/webhook</code>
          <span className="mt-1 block text-xs text-muted">Events: checkout.session.completed, customer.subscription.created / updated / deleted, invoice.paid, invoice.payment_failed</span>
        </div>
      </Section>

      <Section
        title="Google Maps Platform"
        subtitle="Google Maps for the map itself, and Google Places as the baseline listing information (address, hours, phone, website, rating, reviews, photos) until a business or traveler updates it. Routes and Geocoding too. Without a key, OpenStreetMap is used."
        aside={<div className="flex items-center gap-2">{env.google && !i.google.serverKey && <Badge tone="blue">Using server env key</Badge>}<TestButton target="google" /></div>}
      >
        <Field label="Browser key (Maps JavaScript API)" value={i.google.browserKey} onChange={(v) => set("google", { browserKey: v })} placeholder="AIza…" hint="Visible to visitors: restrict it to your website in Google Cloud. Enable “Maps JavaScript API”." />
        <Field label="Server key (Places, Routes, Geocoding)" value={i.google.serverKey} onChange={(v) => set("google", { serverKey: v })} secret placeholder="AIza…" hint="Kept secret: restrict by IP. Enable “Places API (New)”, “Routes API”, “Geocoding API”. Leave blank to reuse the browser key." />
        <div className="grid grid-cols-2 gap-2 text-sm sm:col-span-2">
          {(["mapEnabled", "placesEnabled", "routingEnabled", "geocodingEnabled"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" checked={i.google[k]} onChange={(e) => set("google", { [k]: e.target.checked })} />
              {k === "mapEnabled" ? "Use Google for the map" : k === "placesEnabled" ? "Use Google Places for search & listings" : k === "routingEnabled" ? "Use Google Routes for driving routes" : "Use Google Geocoding for address lookup"}
            </label>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-background p-3 sm:col-span-2">
          <p className="text-sm font-semibold">Monthly caps (0 = unlimited)</p>
          <p className="text-xs text-muted">Stay inside Google&apos;s free allowance: when a cap is reached the app uses the free OpenStreetMap providers until the month rolls over. Google&apos;s free tier is per API and changes; set these a little under the current allowance and also set a quota in Google Cloud as a backstop.</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["places", "routes", "geocoding", "photos"] as const).map((k) => (
              <label key={k} className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{k}</span>
                <input className={field} type="number" min="0" value={i.google.caps[k]} onChange={(e) => set("google", { caps: { ...i.google.caps, [k]: Math.max(0, Number(e.target.value)) } })} />
              </label>
            ))}
          </div>
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Max Places requests per route search</span>
          <input className={field} type="number" min="1" max="60" value={i.google.maxRequestsPerSearch} onChange={(e) => set("google", { maxRequestsPerSearch: Number(e.target.value) })} />
          <span className="mt-1 block text-xs text-muted">Long routes are sampled at this many points (Nearby Search is billed per request). 12 covers a 700-mile drive at roughly 60-mile spacing.</span>
        </label>
      </Section>

      <Section title="Open Charge Map (EV chargers)" subtitle="Tesla Superchargers and hotel chargers. Free key raises rate limits." aside={<TestButton target="openChargeMap" />}>
        <Field label="API key" value={i.openChargeMap.apiKey} onChange={(v) => set("openChargeMap", { apiKey: v })} secret hint="https://openchargemap.org/site/develop/api" wide />
      </Section>

      <Section title="Ticketmaster (concerts, sports, fairs & festivals)" subtitle="Free Discovery API key adds ticketed events to the Events screen. Community-submitted events and the seasonal samples work without it." aside={<TestButton target="ticketmaster" />}>
        <Field label="API key" value={i.ticketmaster.apiKey} onChange={(v) => set("ticketmaster", { apiKey: v })} secret hint="https://developer.ticketmaster.com" wide />
      </Section>

      <Section title="Maps & places" subtitle="Routing, places and geocoding default to free public OpenStreetMap services. Point them at your own servers or a hosted provider for production traffic.">
        <div className="flex items-end justify-between gap-2 sm:col-span-2">
          <Field label="Routing (OSRM) URL" value={i.routing.osrmUrl} onChange={(v) => set("routing", { osrmUrl: v })} wide />
          <TestButton target="routing" />
        </div>
        <div className="flex items-end justify-between gap-2 sm:col-span-2">
          <Field label="Places (Overpass) URL" value={i.places.overpassUrl} onChange={(v) => set("places", { overpassUrl: v })} wide />
          <TestButton target="places" />
        </div>
        <div className="flex items-end justify-between gap-2 sm:col-span-2">
          <Field label="Geocoding (Nominatim) URL" value={i.geocoding.nominatimUrl} onChange={(v) => set("geocoding", { nominatimUrl: v })} wide />
          <TestButton target="geocoding" />
        </div>
        <div className="flex items-end justify-between gap-2 sm:col-span-2">
          <Field label="Map tiles URL template" value={i.tiles.url} onChange={(v) => set("tiles", { url: v })} wide hint="Use {z}/{x}/{y}. Used whenever Google Maps is off or unavailable." />
          <TestButton target="tiles" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs sm:col-span-2">
          <span className="text-muted">Presets with free tiers:</span>
          {[
            { label: "OpenStreetMap (public, light use)", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
            { label: "Stadia Maps (free tier, add key)", url: "https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}.png?api_key=YOUR_KEY", attr: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
            { label: "MapTiler (free tier, add key)", url: "https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=YOUR_KEY", attr: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
          ].map((p) => (
            <button key={p.label} type="button" className="rounded-full border border-border bg-surface px-2 py-0.5 hover:border-blue" onClick={() => set("tiles", { url: p.url, attribution: p.attr })}>
              {p.label}
            </button>
          ))}
        </div>
        <Field label="Tiles attribution (HTML)" value={i.tiles.attribution} onChange={(v) => set("tiles", { attribution: v })} wide />
      </Section>

      <Section title="Email (invites & notifications)" subtitle="Resend delivers invite emails. Without it, invites open the user's own mail app." aside={<TestButton target="email" />}>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Provider</span>
          <select className={field} value={i.email.provider} onChange={(e) => set("email", { provider: e.target.value as I["email"]["provider"] })}>
            <option value="none">None (mailto fallback)</option>
            <option value="resend">Resend</option>
          </select>
        </label>
        <Field label="From address" value={i.email.from} onChange={(v) => set("email", { from: v })} placeholder="RouteDiscover <hello@routediscover.app>" />
        <Field label="API key" value={i.email.apiKey} onChange={(v) => set("email", { apiKey: v })} secret wide />
      </Section>

      <Section title="Text messages (send to phone)" subtitle="Optional. With Twilio connected, “Text me” sends the link from your number. Without it, the button opens the user's own messaging app and the QR code always works, both free." aside={<TestButton target="sms" />}>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Provider</span>
          <select className={field} value={i.sms.provider} onChange={(e) => set("sms", { provider: e.target.value as I["sms"]["provider"] })}>
            <option value="none">None (device messaging app + QR)</option>
            <option value="twilio">Twilio</option>
          </select>
        </label>
        <Field label="From number" value={i.sms.from} onChange={(v) => set("sms", { from: v })} placeholder="+12175550123" />
        <Field label="Account SID" value={i.sms.accountSid} onChange={(v) => set("sms", { accountSid: v })} placeholder="AC…" />
        <Field label="Auth token" value={i.sms.authToken} onChange={(v) => set("sms", { authToken: v })} secret />
      </Section>

      <Section
        title="Custom APIs"
        subtitle="Connect anything else: App Store Connect, Google Play reporting, a CRM, analytics, hotel booking partners. Stored securely and available to future features."
        aside={<Button variant="secondary" className="px-3 py-1 text-xs" onClick={addCustom}>+ Add API</Button>}
      >
        {i.custom.length === 0 && <p className="text-sm text-muted sm:col-span-2">No custom APIs yet.</p>}
        {i.custom.map((x) => (
          <div key={x.id} className="rounded-xl border border-border bg-background p-3 sm:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" value={x.name} onChange={(v) => setCustom(x.id, { name: v })} placeholder="App Store Connect" />
              <Field label="Base URL" value={x.baseUrl} onChange={(v) => setCustom(x.id, { baseUrl: v })} placeholder="https://api.example.com/v1" />
              <Field label="Auth header" value={x.authHeader} onChange={(v) => setCustom(x.id, { authHeader: v })} placeholder="Authorization" />
              <Field label="Auth value" value={x.authValue} onChange={(v) => setCustom(x.id, { authValue: v })} secret placeholder="Bearer …" />
              <Field label="Notes" value={x.notes} onChange={(v) => setCustom(x.id, { notes: v })} wide />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={x.enabled} onChange={(e) => setCustom(x.id, { enabled: e.target.checked })} /> Enabled
              </label>
              <div className="flex items-center gap-2">
                <TestButton target="custom" id={x.id} />
                <Button variant="ghost" className="text-coral" onClick={() => removeCustom(x.id)}>Remove</Button>
              </div>
            </div>
          </div>
        ))}
      </Section>

      <PublishBar c={c} onSave={save} />
    </>
  );
}
