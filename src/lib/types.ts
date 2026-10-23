export type HoursStatus = { openNow: boolean | null; label: string; timezone?: string };

import type { ChargerPricing, ConnectorType, SpeedTier } from "./ev-networks";
export type LatLng = { lat: number; lng: number };

export type DataSource = "live" | "demo";

export type CategoryId =
  | "food"
  | "coffee"
  | "attractions"
  | "outdoors"
  | "historic"
  | "shopping"
  | "antiques"
  | "entertainment"
  | "kids"
  | "lodging"
  | "fuel"
  | "ev"
  | "rest"
  | "restrooms"
  | "groceries"
  | "campgrounds"
  | "travel"
  | "souvenirs"
  | "specialty"
  | "buffets"
  | "wine"
  | "flea"
  | "fairgrounds"
  | "amusement"
  | "gokarts"
  | "minigolf"
  | "golf"
  | "caves"
  | "hiking"
  | "biking"
  | "hotsprings"
  | "boating"
  | "offroad"
  | "bnb"
  | "camping_free"
  | "spa";

export type CategoryGroupId = "food" | "shopping" | "fun" | "outdoors" | "stay" | "roadside";

export type Category = {
  id: CategoryId;
  label: string;
  emoji: string;
  group: CategoryGroupId;
  /** Short help shown in the picker. */
  hint?: string;
  /** Overpass tag selectors (each is appended to a `nwr` query). */
  osm: string[];
  /** Shown by default in "while charging" mode (walkable things). */
  walkable?: boolean;
};

export type GeoResult = {
  label: string;
  lat: number;
  lng: number;
};

export type RouteResult = {
  source: DataSource;
  /** Full route geometry, in travel order. */
  geometry: LatLng[];
  distanceMiles: number;
  durationMinutes: number;
  origin: GeoResult;
  destination: GeoResult;
};

export type Place = {
  id: string;
  name: string;
  category: CategoryId;
  lat: number;
  lng: number;
  /** Miles from the route (perpendicular), when searched along a route. */
  detourMiles?: number;
  /** Miles from the trip origin along the route, when searched along a route. */
  alongMiles?: number;
  /** Miles from the search point, when searched around a point. */
  distanceMiles?: number;
  address?: string;
  website?: string;
  phone?: string;
  openingHours?: string;
  /** Open/closed right now, worked out in the place's own time zone when hours are known. */
  hours?: HoursStatus;
  tags?: Record<string, string>;
  /** Provider that produced this record. */
  provider?: "google" | "osm" | "ocm" | "demo";
  /** Google Places extras, when available. */
  google?: {
    rating?: number;
    ratingCount?: number;
    priceLevel?: string;
    summary?: string;
    mapsUri?: string;
    photoNames?: string[];
    reviews?: Array<{ author: string; rating: number; text: string; time: string }>;
    /** Google's structured hours (day 0 = Sunday) and the place's UTC offset. */
    periods?: Array<{ open: { day: number; hour: number; minute: number }; close?: { day: number; hour: number; minute: number } }>;
    utcOffsetMinutes?: number;
  };
  /* Listing layer (claimed businesses, sponsorship, community ratings) */
  listingId?: string;
  claimed?: boolean;
  sponsored?: boolean;
  rating?: number;
  reviewCount?: number;
};

export type Charger = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  operator?: string;
  /** Network id from src/lib/ev-networks.ts ("tesla", "electrify_america", …, "other", "unknown"). */
  network: string;
  networkLabel: string;
  /** True for Tesla Superchargers (DC fast). */
  supercharger: boolean;
  stalls?: number;
  maxKw?: number;
  speedTier: SpeedTier;
  address?: string;
  cost?: string;
  costTier: "free" | "paid" | "unknown";
  pricing?: ChargerPricing;
  /** Source's own connector names. */
  connectors: string[];
  /** Normalised connector types for filtering. */
  connectorTypes: ConnectorType[];
  detourMiles?: number;
  alongMiles?: number;
  distanceMiles?: number;
};

export type LodgingKind = "hotel" | "campground";

export type Hotel = {
  id: string;
  name: string;
  kind: LodgingKind;
  lat: number;
  lng: number;
  address?: string;
  website?: string;
  phone?: string;
  stars?: string;
  brand?: string;
  /** Whether this hotel has on-site EV charging. */
  hasCharger: boolean;
  chargerTier: "free" | "paid" | "unknown";
  chargerAccess: "guests" | "public" | "unknown";
  teslaDestination: boolean;
  connectors: string[];
  chargerCount?: number;
  chargerNotes?: string;
  detourMiles?: number;
  alongMiles?: number;
  distanceMiles?: number;
  listingId?: string;
  claimed?: boolean;
  sponsored?: boolean;
  rating?: number;
  reviewCount?: number;
};

export type ApiEnvelope<T> = {
  source: DataSource;
  notice?: string;
  data: T;
};

export type EventKind = "fair" | "festival" | "concert" | "car_show" | "swap_meet" | "flea_market" | "yard_sale" | "haunted" | "holiday_lights" | "sports" | "market" | "other";

export type Happening = {
  id: string;
  title: string;
  kind: EventKind;
  description?: string;
  venue?: string;
  address?: string;
  lat: number;
  lng: number;
  /** ISO instants. */
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  url?: string;
  price?: string;
  source: "community" | "ticketmaster" | "demo";
  /** Time zone of the venue, for showing local times. */
  timezone?: string;
  detourMiles?: number;
  alongMiles?: number;
  distanceMiles?: number;
};
