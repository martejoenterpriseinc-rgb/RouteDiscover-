<p align="center">
  <img src="public/brand/routediscover-logo.png" alt="RouteDiscover" width="200" />
</p>

# RouteDiscover

**Find everything worth stopping for along your drive.**

RouteDiscover was born on a drive from Illinois to Lancaster, PA, where finding things to do along the way was harder than it should be. Plan a route, choose how many miles off the road you're willing to go, pick the kinds of places you care about, and see what's coming up, sorted by mile marker. Then do the same at your destination, find Tesla Superchargers with things to do while you charge, and pick a hotel where you can plug in overnight.

## Features

### For travelers

| Screen | What it does |
| --- | --- |
| **Route** | Enter a start and destination (or use your location), set a corridor width from 1 to 50 miles, and filter by category. Results show the mile marker where you'd leave the road and how far off route each stop is. "Only show what's ahead of me" uses your GPS position to hide stops you've already passed. |
| **Destination** | Everything within a chosen radius of a place, by category. Defaults to your trip's destination. |
| **Charging** | Tesla Superchargers along your route, near you, or at your destination. Tap one to see what's walkable (¼, ½, or 1 mile) while you charge: food, coffee, shopping, restrooms, parks. |
| **Hotels** | Hotels with EV charging, along the route or at the destination. Each hotel is flagged **free** or **paid** charging, **Tesla Destination** charger, **guests only** vs **open to public**, with connector types and port counts. |
| **Trips** | Plan a trip with dates, see it on a **calendar**, add stops from any search ("+ Add to trip"), keep notes, mark it completed, and look back on **travel history** (trips taken, miles, stops). |
| **Share & invite** | Turn on a **public link** for any trip, copy it, use the phone's native share sheet, or post to X, Facebook, WhatsApp, email or text. **Invite a friend** by email or referral link; friends who join are connected to your account. |
| **Account** | Create an account, set **preferences** (default miles off route, categories, vehicle and connector, walk radius, home, units, email opt-in), manage the subscription. |

Categories: food, coffee, attractions, outdoors, historic, shopping, antiques & thrift, entertainment, kids, hotels, gas, EV charging, rest areas, restrooms, groceries & pharmacy.

### For businesses

| Area | What it does |
| --- | --- |
| **Listing page** | Every search result opens a full listing: address, hours, phone, website, description, specials, menu, photos, and reviews with ratings, with the data source and sync date shown. |
| **"This is my business"** | Claim a listing with one of two paid plans the owner prices: **Basic monitoring** (monthly) or **Sponsored placement** (one payment buys a set number of days at the top of every search that includes the business, marked "Sponsored", plus everything in Basic). Payment goes through Stripe Checkout; until Stripe is connected claims are granted free and labelled as such. |
| **Business account** (`/app/business`) | Edit everything travelers see (overrides sit on top of the synced data and can be cleared), **Sync from online** to refresh the synced layer, **traffic** (listing views, search impressions, website/map/call clicks, trip adds, daily chart), a **customer updates queue** with approve/reject, and sponsor purchase/extension. |
| **Community updates** | Signed-in travelers can write reviews, add photos, post menus and specials, suggest hours, and suggest corrections. Every submission is risk-scored (new account, links, rapid posting, abusive language, "closed" hour changes, contact-detail changes, repeat rejections) and goes to the business queue; anything at or above the owner-set threshold is held for the RouteDiscover owner only. Approved hours/corrections update the listing; approved reviews, photos, menus and specials become visible. |
| **Campground finder** | The Stays screen (formerly Hotels) searches hotels, campgrounds, or both, with the same EV-charging flags (free vs paid, Tesla Destination, RV hookups where tagged). |

### For the owner

| Area | What it does |
| --- | --- |
| **Landing page** (`/`) | Marketing page with features, the monthly price and free trial you set, App Store / Google Play badges (or "coming soon"), install-to-home-screen, and sign-up CTAs. |
| **Subscriptions** | Recurring monthly billing through **Stripe** Checkout with an optional free trial, a customer portal for cancellations, and webhooks that keep access in sync. Access to the app can be gated on an active subscription. |
| **Dashboard** (`/owner`) | Revenue (MRR, active, trialing, past due, canceled, churn, conversion), users (total, new, active today / week / month, logins), downloads & acquisition (store badge clicks, home-screen installs, landing visitors, visitor→signup rate, invites, referrals), engagement (trips, stops, shares), daily charts, recent activity, and a launch checklist. |
| **Users** | Every account with subscription status, trip count, join date and last activity. |
| **Pricing & app** | Set the monthly price, currency, free-trial days, whether a subscription is required, the feature list, app name/tagline, support email, store links and social links. Business plans: Basic monthly price, Sponsored price, **sponsored days per purchase**, the moderation hold threshold, and whether claims require payment. |
| **Businesses** | Every claimed listing with its plan (Sponsor / Basic / lapsed), who claimed it, whether they paid via Stripe or were granted free, revenue, and a Revoke action. Totals for claims, sponsors, Basic subscribers and business revenue. |
| **Moderation** | The audit queue for all community updates with risk flags and submitter history; approve, reject, or ban a user (which rejects their pending updates). Filters for pending, held-for-audit, approved, rejected. |
| **Integrations** ("connect any API") | Stripe, Open Charge Map, routing, places, geocoding, map tiles, email (Resend), plus **custom APIs** (name, base URL, auth header). Each has **Test connection**. Save as a draft with **Update and save**, then **Go live** to publish; going live also creates or verifies the Stripe price. Secrets are encrypted at rest and masked in the console. |

The **first account created becomes the owner**. Owner pages live under `/owner` and the API under `/api/owner/*`.

### Billing setup (Stripe)

1. In Stripe, copy your secret key and publishable key into **Owner → Integrations → Stripe**.
2. Add a webhook endpoint in Stripe pointing at `https://<your-domain>/api/billing/webhook` with events `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed`, `invoice.payment_failed`, and paste the signing secret into the console.
3. Set the price and trial under **Owner → Pricing & app**, then press **Go live**. RouteDiscover creates the Stripe product and recurring price for you (and a new price whenever you change the amount).
4. Until Stripe is connected, everyone gets free access even if "require subscription" is on; the dashboard's launch checklist shows what's left.

### Mobile apps

The web app ships a manifest and icons, so it installs to iOS and Android home screens today. For the App Store and Google Play, wrap the same app with [Capacitor](https://capacitorjs.com/): `npx cap init`, point it at the deployed URL (or a static export), add the `ios` and `android` platforms, and submit. The API routes, accounts and billing are shared, so nothing is duplicated. Once the apps are listed, paste the store URLs into **Owner → Pricing & app** and the landing page badges go live; store download counts can be connected from App Store Connect and Google Play Console through **Integrations → Custom APIs**.

## Data sources

Everything runs on free, open data with no API keys required:

| Need | Provider | Notes |
| --- | --- | --- |
| Geocoding | [Nominatim](https://nominatim.org/) (OpenStreetMap) | Also accepts raw `lat, lng` |
| Routing | [OSRM](https://project-osrm.org/) | Driving profile, full route geometry |
| Places | [Overpass API](https://overpass-api.de/) (OpenStreetMap) | Corridor search uses Overpass's polyline `around` filter |
| Superchargers & hotel chargers | [Open Charge Map](https://openchargemap.org/) | Tesla operator filter for Superchargers; cost text and usage type drive the free/paid/guest flags |
| Hotel charging (second source) | OpenStreetMap `amenity=charging_station` | `fee`, `access`, `socket:*` tags |
| Map tiles | OpenStreetMap | Swap in a commercial tile provider for production |

Every provider has a **sample-data fallback** bundled in [`src/lib/demo/data.ts`](src/lib/demo/data.ts) (the Chicago → Lancaster and Springfield → Lancaster corridors). When a live service is unreachable the UI shows a "Sample data" banner so nobody mistakes illustrative listings for verified ones. Set `ROUTEDISCOVER_DATA_MODE=live` to disable the fallback, or `demo` to develop offline.

The public OSRM, Overpass, and Nominatim servers are rate-limited community services. They're fine for development and light use; for a production launch, self-host them or use a hosted provider, and set the URLs in `.env.local`. An Open Charge Map API key is free and raises rate limits.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: database URL, APP_SECRET, keys
npm run dev                  # http://localhost:3000
```

With no `DATABASE_URL`, an embedded Postgres (PGlite) is created in `./data/pglite`, so nothing else needs installing. For production set `DATABASE_URL` to a Postgres instance and `APP_SECRET` to a random string; migrations in `drizzle/` run automatically on startup.

Other scripts:

```bash
npm run build      # production build
npm start          # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc
npm test           # unit tests (geo math, cost classification, categories, billing/webhooks)
npm run check      # lint + typecheck + test
npx drizzle-kit generate   # after changing src/db/schema.ts
```

## Project layout

```
src/app/                 Next.js App Router
  page.tsx               Marketing landing page (pricing, store badges)
  login/ signup/         Accounts
  app/                   Signed-in app: route explorer, destination, charging, hotels,
                         trips (list, calendar, history, detail), account, subscribe
  t/[token]/             Public shared trip
  invite/[code]/         Referral links
  owner/                 Owner console: dashboard, users, pricing & app, integrations
  api/                   geocode, route, places, chargers, hotels, auth, me, trips,
                         invites, events, billing (checkout, portal, webhook), owner/*
  manifest.ts            PWA manifest (uses the logo for icons)
src/proxy.ts             Edge redirects for signed-out visitors, anonymous visitor cookie
src/components/          Map (Leaflet), trip planner, cards, calendar, charts, owner console
src/hooks/               useTrip (shared trip state), useSearch, useGeolocation
src/db/                  Drizzle schema + connection (PGlite in dev, Postgres in prod)
drizzle/                 SQL migrations
src/lib/
  auth.ts                Passwords (scrypt), sessions, owner/user roles
  settings.ts            Owner settings: draft → live, encrypted secrets, env fallbacks
  stripe.ts  billing.ts  Checkout, portal, webhooks, price sync, access rules
  stats.ts               Owner dashboard metrics
  trips.ts  events.ts    Trip service, analytics events
  geo.ts  categories.ts  Geo math, category ↔ OpenStreetMap tags
  providers/             geocode, routing, places, chargers (+ hotels) with demo fallbacks
public/brand/            Logo, header mark, PWA icons, social image
tests/                   node:test unit tests
```

## API

All search endpoints accept either a route corridor or a point:

```jsonc
// POST /api/places
{ "route": [{ "lat": 41.87, "lng": -87.62 }, ...], "radiusMiles": 10, "categories": ["food", "attractions"] }
{ "center": { "lat": 40.04, "lng": -76.31 }, "radiusMiles": 15, "categories": ["antiques"] }

// POST /api/chargers  → Tesla Superchargers       { route | center, radiusMiles }
// POST /api/hotels    → hotels + charger details   { route | center, radiusMiles }
// POST /api/route     → { origin, destination }    each a place name or { lat, lng }
// GET  /api/geocode?q=Lancaster%20PA
```

Responses are `{ source: "live" | "demo", notice?, data }`. Corridor results carry `alongMiles` (mile marker from the origin) and `detourMiles`; point results carry `distanceMiles`.

## Roadmap ideas

- Native iOS/Android wrappers (Capacitor) with CarPlay / Android Auto
- Charger live availability and charge-time estimates
- Hotel booking links and verified charging details from hotel partners
- Non-Tesla fast charging networks (Electrify America, EVgo, ChargePoint)
- Turn-by-turn hand-off to the car's navigation with multi-stop itineraries
- Annual plan and promo codes (Stripe already supports promotion codes at checkout)
