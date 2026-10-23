<p align="center">
  <img src="public/brand/routediscover-logo.png" alt="RouteDiscover" width="200" />
</p>

# RouteDiscover

**Find everything worth stopping for along your drive.**

RouteDiscover was born on a drive from Illinois to Lancaster, PA, where finding things to do along the way was harder than it should be. Plan a route, choose how many miles off the road you're willing to go, pick the kinds of places you care about, and see what's coming up, sorted by mile marker. Then do the same at your destination, find Tesla Superchargers with things to do while you charge, and pick a hotel where you can plug in overnight.

## Features

| Screen | What it does |
| --- | --- |
| **Route** | Enter a start and destination (or use your location), set a corridor width from 1 to 50 miles, and filter by category. Results show the mile marker where you'd leave the road and how far off route each stop is. "Only show what's ahead of me" uses your GPS position to hide stops you've already passed. |
| **Destination** | Everything within a chosen radius of a place, by category. Defaults to your trip's destination. |
| **Charging** | Tesla Superchargers along your route, near you, or at your destination. Tap one to see what's walkable (¼, ½, or 1 mile) while you charge: food, coffee, shopping, restrooms, parks. |
| **Hotels** | Hotels with EV charging, along the route or at the destination. Each hotel is flagged **free** or **paid** charging, **Tesla Destination** charger, **guests only** vs **open to public**, with connector types and port counts. |

Categories: food, coffee, attractions, outdoors, historic, shopping, antiques & thrift, entertainment, kids, hotels, gas, EV charging, rest areas, restrooms, groceries & pharmacy.

The app is a mobile-first web app with a web manifest, so it installs to a phone's home screen and works in the car as a standalone app.

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
cp .env.example .env.local   # optional: add keys / custom endpoints
npm run dev                  # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm start          # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc
npm test           # unit tests (geo math, cost classification, categories)
npm run check      # lint + typecheck + test
```

## Project layout

```
src/app/                 Next.js App Router pages and API route handlers
  page.tsx               Route explorer
  destination/           Destination lookup
  charging/              Supercharger stops + "while you charge"
  hotels/                Hotels with EV charging
  api/{geocode,route,places,chargers,hotels}/route.ts
  manifest.ts            PWA manifest (uses the logo for icons)
src/components/          Map (Leaflet), trip planner, cards, nav, UI primitives
src/hooks/               useTrip (shared trip state), useSearch, useGeolocation
src/lib/
  geo.ts                 Haversine, distance-to-route, mile markers, simplification, polylines
  categories.ts          Category → OpenStreetMap tag mapping
  providers/             geocode, routing, places, chargers (+ hotels) with demo fallbacks
  demo/data.ts           Bundled sample corridor data
  config.ts              Env-driven configuration and the live/demo fallback wrapper
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

- Save trips and favourite stops; share a trip link
- Turn-by-turn hand-off to the car's navigation with multi-stop itineraries
- Charger live availability (Tesla / Open Charge Map status) and charge-time estimates
- Hotel booking links and verified charging details from hotel partners
- Non-Tesla fast charging networks (Electrify America, EVgo, ChargePoint)
- Native iOS/Android wrappers (Capacitor) with CarPlay / Android Auto
