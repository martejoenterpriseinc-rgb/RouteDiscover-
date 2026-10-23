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
import { ThemeToggle } from "@/components/ThemeToggle";
import { checkSignup } from "@/lib/access";
import { ALL_NETWORKS } from "@/lib/ev-networks";
import { formatPrice, getLiveSettings } from "@/lib/settings";

const FEATURES = [
  { icon: "🛣️", title: "Everything along your route", text: "Set how many miles off the highway you'll go and see attractions, food, outdoors, history, antiques and more, sorted by mile marker." },
  { icon: "📍", title: "Destination lookup", text: "Arrive knowing what's around you. Search any radius around your destination by category." },
  { icon: "⚡", title: "EV charging stops on every network", text: "Tesla, Electrify America, EVgo, ChargePoint, Rivian, IONNA and dozens more, filtered by plug, speed and price, with the published rate and fees on each stop and what's walkable while you charge." },
  { icon: "🏨", title: "Hotels and campgrounds with chargers", text: "Sleep where you can plug in. Free vs paid charging, Tesla Destination and Level 2 chargers, RV hookups and guest-only access, all flagged." },
  { icon: "🗓️", title: "Plan it on a calendar", text: "Save trips with dates, build your stop list, and look back on your travel history." },
  { icon: "🔗", title: "Share and invite", text: "Send a trip link, invite friends, and post your route to social media." },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/app/home");
  const s = await getLiveSettings();
  const stats = await getPublicStats();
  const gate = await checkSignup(false);
  const open = gate.open;
  const byApproval = !open && gate.reason === "request";
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
            <Image src="/brand/mark.png" alt="" width={36} height={43} priority className="brand-mark h-10 w-auto" />
            <Wordmark className="text-lg sm:text-xl" />
          </Link>
          <nav className="ml-auto flex shrink-0 items-center gap-2 text-sm font-semibold">
            <a href="#features" className="hidden px-3 text-muted hover:text-foreground md:block">Features</a>
            <a href="#pricing" className="hidden px-3 text-muted hover:text-foreground md:block">Pricing</a>
            <ThemeToggle compact />
            <Link href="/login" className="whitespace-nowrap rounded-full bg-blue px-4 py-1.5 font-semibold text-white shadow-sm hover:brightness-110">Sign in</Link>
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
              {open ? (
                <Link href="/signup" className="rounded-xl bg-gradient-to-r from-coral to-orange px-6 py-3 text-base font-semibold text-white shadow-lg">
                  {s.pricing.trialEnabled && s.pricing.trialDays > 0 ? `Start your ${s.pricing.trialDays}-day free trial` : s.pricing.model === "pass" ? `Get a ${s.pricing.passDays}-day pass` : "Get started"}
                </Link>
              ) : byApproval ? (
                <Link href="/signup" className="rounded-xl bg-gradient-to-r from-coral to-orange px-6 py-3 text-base font-semibold text-white shadow-lg">
                  Request an account
                </Link>
              ) : (
                <span className="rounded-xl border border-orange/50 bg-surface px-6 py-3 text-base font-semibold text-orange">{s.access.closedTitle}</span>
              )}
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
            <span className="brand-plate"><Image src="/brand/routediscover-logo.png" alt="RouteDiscover" width={420} height={420} priority className="h-64 w-64 drop-shadow-xl md:h-96 md:w-96" /></span>
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

      <section className="border-y border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-12">
          <h2 className="text-center text-3xl font-extrabold tracking-tight">Every charging network, one search</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted">
            RouteDiscover shows public chargers from every network it finds along your route, near you or at your destination, and anything it doesn&apos;t recognise is listed under the operator&apos;s own name, so nothing is left out.
          </p>
          {(
            [
              ["network", "Charging networks"],
              ["host", "Gas stations, travel centers and stores that host chargers"],
            ] as const
          ).map(([kind, heading]) => (
            <div key={kind} className="mt-6">
              <h3 className="text-center text-xs font-semibold uppercase tracking-wide text-muted">{heading}</h3>
              <ul className="mt-2 flex flex-wrap justify-center gap-2" aria-label={heading}>
                {ALL_NETWORKS.filter((n) => n.kind === kind).map((n) => (
                  <li key={n.id} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold" style={{ borderColor: `${n.color}55`, color: n.color, background: `${n.color}12` }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: n.color }} aria-hidden />
                    {n.label}
                  </li>
                ))}
                {kind === "host" && <li className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm font-semibold text-muted">+ any other operator</li>}
              </ul>
            </div>
          ))}
          <div className="mt-8 grid gap-4 text-sm sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <h3 className="font-bold">🔌 Every plug</h3>
              <p className="mt-1 text-muted">NACS / Tesla, CCS, CHAdeMO and J1772, so you only see chargers your car can use.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <h3 className="font-bold">⚡ Every speed</h3>
              <p className="mt-1 text-muted">Level 1 and Level 2 for overnight stops, DC fast from 50 kW, and ultra-fast 150 to 400 kW for road trips, with the top speed shown on each stop.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <h3 className="font-bold">💲 Price up front</h3>
              <p className="mt-1 text-muted">Free or paid, the published rate per kWh or per minute, and any session, idle, parking or membership fees, as reported by the network.</p>
            </div>
          </div>
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
            {open ? (
              <Link href="/signup" className="mt-6 block rounded-xl bg-gradient-to-r from-coral to-orange px-6 py-3 text-center text-base font-semibold text-white shadow-lg">
                Create your account
              </Link>
            ) : byApproval ? (
              <Link href="/signup" className="mt-6 block rounded-xl bg-gradient-to-r from-coral to-orange px-6 py-3 text-center text-base font-semibold text-white shadow-lg">
                Request an account
              </Link>
            ) : (
              <p className="mt-6 rounded-xl border border-orange/50 bg-cream px-6 py-3 text-center text-sm font-semibold text-orange">{s.access.closedMessage}</p>
            )}
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
          <Link className="hover:text-foreground" href="/terms">Terms</Link>
          <Link className="hover:text-foreground" href="/privacy">Privacy</Link>
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
