import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Disclosure } from "@/components/Disclosure";
import { KpiStripLive } from "@/components/KpiStrip";
import { Wordmark } from "@/components/AppNav";
import { Badge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { myBusinesses } from "@/lib/business";
import { fmtDate, todayIso } from "@/lib/dates";
import { getLiveSettings } from "@/lib/settings";
import { listTrips } from "@/lib/trips";

export const metadata: Metadata = { title: "Home" };

const ACTIONS = [
  { href: "/app", icon: "🛣️", title: "Plan a route", text: "Pick miles off the highway and see what's worth the stop." },
  { href: "/app/destination", icon: "📍", title: "Explore a destination", text: "Everything around where you're headed." },
  { href: "/app/charging", icon: "⚡", title: "EV charging stops", text: "Every network, filtered by plug, speed and price." },
  { href: "/app/hotels", icon: "🏨", title: "Stays with charging", text: "Hotels and campgrounds where you can plug in." },
  { href: "/app/trips", icon: "🗓️", title: "My trips", text: "Calendar, history and saved stops." },
  { href: "/app/referrals", icon: "🎁", title: "Refer & earn", text: "Share your link, earn credit." },
];

export default async function HomePage() {
  const user = await requireUser();
  const [access, trips, businesses, s] = await Promise.all([getAccess(user), listTrips(user.id), myBusinesses(user.id), getLiveSettings()]);
  const today = todayIso();
  const upcoming = trips.filter((t) => t.status === "planned" && t.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const next = upcoming[0];
  const recent = trips.filter((t) => !upcoming.includes(t)).slice(0, 3);
  const first = (user.name || user.email).split(/[ @]/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4">
      <section className="flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br from-cream to-surface p-6 text-center md:flex-row md:text-left">
        <span className="brand-plate"><Image src="/brand/routediscover-logo.png" alt="RouteDiscover" width={140} height={140} priority className="h-28 w-28" /></span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {greeting}, {first}.
          </h1>
          <p className="mt-1 text-muted">{s.app.tagline}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <Badge tone={access.allowed ? "free" : "paid"}>
              {access.allowed
                ? access.complimentary && access.status !== "none" ? (access.kind === "trial" ? "Free trial" : "Complimentary pass") : access.status === "none" ? "Free access" : access.kind === "subscription" ? "Subscribed" : "Pass active"
                : "Pass needed"}
              {access.daysLeft != null && access.allowed ? ` · ${access.daysLeft} days left` : ""}
            </Badge>
            {user.role === "owner" && <Link href="/owner" className="rounded-full border border-orange/60 bg-cream px-3 py-0.5 text-xs font-semibold text-orange hover:bg-orange hover:text-white">Owner console →</Link>}
            {businesses.length > 0 && <Link href="/app/business" className="rounded-full border border-blue/40 bg-blue/10 px-3 py-0.5 text-xs font-semibold text-blue hover:bg-blue hover:text-white">My businesses ({businesses.length}) →</Link>}
            {!access.allowed && access.billingConfigured && <Link href="/app/subscribe" className="rounded-full bg-gradient-to-r from-coral to-orange px-3 py-0.5 text-xs font-semibold text-white">Get a pass →</Link>}
          </div>
        </div>
        <div className="hidden md:block"><Wordmark className="text-xl" /></div>
      </section>

      <Disclosure id="home-actions" title="What do you want to do?" size="lg" bodyClassName="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-blue hover:shadow">
            <span className="text-2xl leading-none" aria-hidden>{a.icon}</span>
            <span className="min-w-0">
              <span className="block font-semibold">{a.title}</span>
              <span className="block text-sm text-muted">{a.text}</span>
            </span>
          </Link>
        ))}
      </Disclosure>

      <div className="grid gap-4 lg:grid-cols-2">
        <Disclosure id="home-next-trip" title="Next trip" size="lg" className="rounded-2xl border border-border bg-surface p-5 shadow-sm" bodyClassName="mt-3">
          {next ? (
            <div>
              <Link href={`/app/trips/${next.id}`} className="text-lg font-bold hover:underline">{next.name}</Link>
              <p className="text-sm text-muted">{next.origin.label} → {next.destination.label}</p>
              <p className="mt-1 text-sm">{fmtDate(next.startDate)}{next.endDate !== next.startDate ? ` – ${fmtDate(next.endDate)}` : ""} · {next.stops.length} {next.stops.length === 1 ? "stop" : "stops"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/app/trips/${next.id}`} className="rounded-xl bg-gradient-to-r from-coral to-orange px-4 py-2 text-sm font-semibold text-white shadow">Open trip</Link>
                <Link href={`/app?o=${next.origin.lat},${next.origin.lng}&d=${next.destination.lat},${next.destination.lng}&ol=${encodeURIComponent(next.origin.label)}&dl=${encodeURIComponent(next.destination.label)}`} className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-cream">Find stops along it</Link>
              </div>
              {upcoming.length > 1 && <p className="mt-3 text-xs text-muted">{upcoming.length - 1} more upcoming · <Link href="/app/trips?view=calendar" className="text-blue hover:underline">calendar</Link></p>}
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted">No trips planned yet. Plan a route, then save it as a trip to get a calendar, shareable link and saved stops.</p>
              <Link href="/app/trips/new" className="mt-3 inline-block rounded-xl bg-gradient-to-r from-coral to-orange px-4 py-2 text-sm font-semibold text-white shadow">Plan a trip</Link>
            </div>
          )}
        </Disclosure>

        <Disclosure id="home-recent" title="Recent trips" size="lg" className="rounded-2xl border border-border bg-surface p-5 shadow-sm" bodyClassName="mt-3">
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Trips you&apos;ve finished show up here as travel history.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/app/trips/${t.id}`} className="min-w-0 truncate font-semibold hover:underline">{t.name}</Link>
                  <span className="shrink-0 text-xs text-muted">{fmtDate(t.startDate)} · {t.status}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/app/trips?view=history" className="mt-2 inline-block text-xs font-semibold text-blue hover:underline">All history →</Link>
        </Disclosure>
      </div>

      <Disclosure id="home-community" title="RouteDiscover right now" size="lg" className="rounded-2xl border border-border bg-surface p-5 shadow-sm" bodyClassName="mt-3">
        <KpiStripLive compact />
      </Disclosure>
    </main>
  );
}
