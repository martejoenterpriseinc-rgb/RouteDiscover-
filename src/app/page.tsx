import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/AppNav";
import { DownloadButtons } from "@/components/Landing";
import { KpiStrip } from "@/components/KpiStrip";
import { getCurrentUser } from "@/lib/auth";
import { track } from "@/lib/events";
import { getPublicStats } from "@/lib/public-stats";
import { formatPrice, getLiveSettings } from "@/lib/settings";

const FEATURES = [
  { icon: "🛣️", title: "Everything along your route", text: "Set how many miles off the highway you'll go and see attractions, food, outdoors, history, antiques and more, sorted by mile marker." },
  { icon: "📍", title: "Destination lookup", text: "Arrive knowing what's around you. Search any radius around your destination by category." },
  { icon: "⚡", title: "Supercharger stops that don't waste time", text: "Tesla Superchargers along the way, plus what's walkable while you charge: coffee, food, shopping, restrooms." },
  { icon: "🏨", title: "Hotels with chargers", text: "Sleep where you can plug in. Free vs paid charging, Tesla Destination chargers and guest-only access, all flagged." },
  { icon: "🗓️", title: "Plan it on a calendar", text: "Save trips with dates, build your stop list, and look back on your travel history." },
  { icon: "🔗", title: "Share and invite", text: "Send a trip link, invite friends, and post your route to social media." },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/app");
  const s = await getLiveSettings();
  const stats = await getPublicStats();
  const anonId = (await cookies()).get("rd_anon")?.value ?? null;
  void track("landing_view", { anonId });

  const price = formatPrice(s.pricing.monthlyPriceCents, s.pricing.currency);
  const socials = [
    { label: "X", href: s.app.socialX },
    { label: "Facebook", href: s.app.socialFacebook },
    { label: "Instagram", href: s.app.socialInstagram },
  ].filter((x) => x.href);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/brand/mark.png" alt="" width={36} height={43} priority className="h-10 w-auto" />
            <Wordmark className="text-xl" />
          </Link>
          <nav className="ml-auto flex items-center gap-2 text-sm font-semibold">
            <a href="#features" className="hidden px-3 text-muted hover:text-foreground md:block">Features</a>
            <a href="#pricing" className="hidden px-3 text-muted hover:text-foreground md:block">Pricing</a>
            <Link href="/login" className="rounded-full px-3 py-1.5 text-muted hover:bg-cream hover:text-foreground">Sign in</Link>
            <Link href="/signup" className="rounded-full bg-gradient-to-r from-coral to-orange px-4 py-1.5 text-white shadow">Start free trial</Link>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-b from-cream to-background">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-3 inline-block rounded-full border border-orange/50 bg-surface px-3 py-1 text-xs font-semibold text-orange">
              Built for road trips and EV drivers
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Never drive past the good stuff again.
            </h1>
            <p className="mt-4 text-lg text-muted">{s.app.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-xl bg-gradient-to-r from-coral to-orange px-6 py-3 text-base font-semibold text-white shadow-lg">
                {s.pricing.trialEnabled && s.pricing.trialDays > 0 ? `Start your ${s.pricing.trialDays}-day free trial` : s.pricing.model === "pass" ? `Get a ${s.pricing.passDays}-day pass` : "Get started"}
              </Link>
              <a href="#features" className="rounded-xl border border-border bg-surface px-6 py-3 text-base font-semibold hover:bg-cream">
                See how it works
              </a>
            </div>
            <p className="mt-3 text-sm text-muted">
              {s.pricing.model === "pass" ? `${price} one time for ${s.pricing.passDays} days of use. No subscription.` : `${price}/month${s.pricing.trialEnabled && s.pricing.trialDays > 0 ? " after the trial" : ""}. Cancel anytime.`}
              {s.referrals.enabled && s.referrals.referrerBonusCents > 0 ? ` Share with friends and earn ${formatPrice(s.referrals.referrerBonusCents, s.pricing.currency)} credit per qualifying friend.` : ""}
            </p>
            <div className="mt-6">
              <DownloadButtons appStoreUrl={s.app.appStoreUrl} playStoreUrl={s.app.playStoreUrl} compact />
            </div>
            <div className="mt-8">
              <KpiStrip stats={stats} />
            </div>
          </div>
          <div className="flex justify-center">
            <Image src="/brand/routediscover-logo.png" alt="RouteDiscover" width={420} height={420} priority className="h-64 w-64 drop-shadow-xl md:h-96 md:w-96" />
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-14">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">Everything a long drive needs</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-muted">
          RouteDiscover was born on a drive from Illinois to Lancaster, PA, where finding things to do along the way was harder than it should be.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="text-3xl" aria-hidden>{f.icon}</div>
              <h3 className="mt-2 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="bg-navy text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">One simple plan</h2>
            <p className="mt-2 text-white/80">Everything included. No ads, no upsells, no per-trip fees.</p>
            <ul className="mt-6 space-y-2">
              {s.pricing.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-green" aria-hidden>✔</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-surface p-8 text-foreground shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">{s.pricing.model === "pass" ? `RouteDiscover ${s.pricing.passDays}-day pass` : "RouteDiscover monthly"}</p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-5xl font-extrabold tracking-tight">{price}</span>
              <span className="text-muted">{s.pricing.model === "pass" ? `/ ${s.pricing.passDays} days` : "/ month"}</span>
            </p>
            {s.pricing.trialEnabled && s.pricing.trialDays > 0 && (
              <p className="mt-1 text-sm font-semibold text-green">{s.pricing.trialDays}-day free trial first</p>
            )}
            <p className="mt-1 text-sm text-muted">{s.pricing.model === "pass" ? "One-time payment. Buy another pass whenever you hit the road again." : "Billed monthly. Cancel anytime from your account."}</p>
            {s.referrals.enabled && s.referrals.referrerBonusCents > 0 && (
              <p className="mt-1 text-sm text-muted">🎁 {s.referrals.promoTitle}: {formatPrice(s.referrals.referrerBonusCents, s.pricing.currency)} credit per friend who pays for {s.referrals.qualifyingPayments} {s.pricing.model === "pass" ? "passes" : "months"}.</p>
            )}
            <Link href="/signup" className="mt-6 block rounded-xl bg-gradient-to-r from-coral to-orange px-6 py-3 text-center text-base font-semibold text-white shadow-lg">
              Create your account
            </Link>
            <p className="mt-3 text-center text-xs text-muted">Secure payments by Stripe</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">Take it on the road</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          Use RouteDiscover in your browser today, or install it on your phone. Native iPhone and Android apps are on the way.
        </p>
        <div className="mt-6 flex justify-center">
          <DownloadButtons appStoreUrl={s.app.appStoreUrl} playStoreUrl={s.app.playStoreUrl} />
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-6 text-sm text-muted">
          <Wordmark className="text-base" />
          <span>© {new Date().getFullYear()} {s.app.name}</span>
          {s.app.supportEmail && <a className="hover:text-foreground" href={`mailto:${s.app.supportEmail}`}>Support</a>}
          <span className="ml-auto flex gap-3">
            {socials.map((x) => (
              <a key={x.label} href={x.href} target="_blank" rel="noreferrer" className="hover:text-foreground">{x.label}</a>
            ))}
          </span>
        </div>
      </footer>
    </div>
  );
}
