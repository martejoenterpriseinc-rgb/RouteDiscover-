import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { decrypt, encrypt, isEncrypted, maskSecret } from "./crypto";

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

export type CustomApi = {
  id: string;
  name: string;
  baseUrl: string;
  authHeader: string;
  authValue: string;
  notes: string;
  enabled: boolean;
};

export type AppSettings = {
  app: {
    name: string;
    tagline: string;
    supportEmail: string;
    websiteUrl: string;
    appStoreUrl: string;
    playStoreUrl: string;
    socialX: string;
    socialFacebook: string;
    socialInstagram: string;
  };
  pricing: {
    /** "pass": one-time charge for `passDays` of access. "subscription": renews monthly. */
    model: "pass" | "subscription";
    monthlyPriceCents: number;
    passDays: number;
    currency: string;
    trialEnabled: boolean;
    trialDays: number;
    requireSubscription: boolean;
    features: string[];
    stripeProductId: string;
    stripePriceId: string;
  };
  referrals: {
    enabled: boolean;
    /** Credit for the referrer once the friend qualifies. */
    referrerBonusCents: number;
    /** Credit for the new customer once they qualify (0 = none). */
    refereeBonusCents: number;
    /** Paid periods (passes or monthly payments) the friend must complete. */
    qualifyingPayments: number;
    /** Only users with an active pass/subscription can share a referral link. */
    referrerMustBePaid: boolean;
    promoTitle: string;
    promoText: string;
  };
  business: {
    /** Basic monitoring plan, billed monthly. */
    basicPriceCents: number;
    /** Sponsored placement: one payment buys `sponsorDays` at the top of results (plus everything in Basic). */
    sponsorPriceCents: number;
    sponsorDays: number;
    /** When false (or when Stripe is not connected) claims are granted without payment. */
    requirePayment: boolean;
    stripeBasicPriceId: string;
    stripeSponsorPriceId: string;
    stripeProductId: string;
    /** Risk score at or above which a submission is held for the RouteDiscover owner. */
    flagThreshold: number;
  };
  integrations: {
    stripe: { secretKey: string; publishableKey: string; webhookSecret: string };
    /**
     * Google Maps Platform. The browser key draws the map (Maps JavaScript API,
     * restrict it by website); the server key powers Places, Routes and
     * Geocoding (restrict it by IP). One key can be used for both.
     */
    google: { browserKey: string; serverKey: string; mapEnabled: boolean; placesEnabled: boolean; routingEnabled: boolean; geocodingEnabled: boolean; maxRequestsPerSearch: number };
    openChargeMap: { apiKey: string };
    routing: { osrmUrl: string };
    places: { overpassUrl: string };
    geocoding: { nominatimUrl: string };
    tiles: { url: string; attribution: string };
    email: { provider: "none" | "resend"; apiKey: string; from: string };
    custom: CustomApi[];
  };
};

/** Dot paths of fields that are encrypted at rest and masked in the console. */
export const SECRET_PATHS = [
  "integrations.stripe.secretKey",
  "integrations.stripe.webhookSecret",
  "integrations.google.serverKey",
  "integrations.openChargeMap.apiKey",
  "integrations.email.apiKey",
] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  app: {
    name: "RouteDiscover",
    tagline: "Find everything worth stopping for along your drive.",
    supportEmail: "",
    websiteUrl: "",
    appStoreUrl: "",
    playStoreUrl: "",
    socialX: "",
    socialFacebook: "",
    socialInstagram: "",
  },
  pricing: {
    model: "pass",
    monthlyPriceCents: 499,
    passDays: 30,
    currency: "usd",
    trialEnabled: false,
    trialDays: 7,
    requireSubscription: true,
    features: [
      "Unlimited route corridor searches with 15 categories",
      "Tesla Supercharger stops with walkable things to do",
      "Hotels with free and paid EV charging",
      "Trip planner with calendar, history and saved stops",
      "Share trips by link, invite friends, post to social",
    ],
    stripeProductId: "",
    stripePriceId: "",
  },
  referrals: {
    enabled: true,
    referrerBonusCents: 100,
    refereeBonusCents: 0,
    qualifyingPayments: 2,
    referrerMustBePaid: true,
    promoTitle: "Share RouteDiscover, earn credit",
    promoText: "Every friend who joins with your link and pays for 2 months of use earns you $1 off your next pass.",
  },
  business: {
    basicPriceCents: 1999,
    sponsorPriceCents: 4900,
    sponsorDays: 30,
    requirePayment: true,
    stripeBasicPriceId: "",
    stripeSponsorPriceId: "",
    stripeProductId: "",
    flagThreshold: 5,
  },
  integrations: {
    stripe: { secretKey: "", publishableKey: "", webhookSecret: "" },
    google: { browserKey: "", serverKey: "", mapEnabled: true, placesEnabled: true, routingEnabled: true, geocodingEnabled: true, maxRequestsPerSearch: 12 },
    openChargeMap: { apiKey: "" },
    routing: { osrmUrl: "https://router.project-osrm.org" },
    places: { overpassUrl: "https://overpass-api.de/api/interpreter" },
    geocoding: { nominatimUrl: "https://nominatim.openstreetmap.org" },
    tiles: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    email: { provider: "none", apiKey: "", from: "" },
    custom: [],
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type Json = Record<string, unknown>;

function getPath(obj: Json, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Json)[k] : undefined), obj);
}

function setPath(obj: Json, path: string, value: unknown) {
  const keys = path.split(".");
  let cur: Json = obj;
  for (const k of keys.slice(0, -1)) {
    if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k] as Json;
  }
  cur[keys[keys.length - 1]] = value;
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (Array.isArray(patch)) return patch as T;
  if (patch && typeof patch === "object" && base && typeof base === "object" && !Array.isArray(base)) {
    const out: Json = { ...(base as Json) };
    for (const [k, v] of Object.entries(patch as Json)) {
      out[k] = deepMerge((base as Json)[k], v);
    }
    return out as T;
  }
  return patch === undefined ? base : (patch as T);
}

function mapSecrets(s: AppSettings, fn: (value: string) => string): AppSettings {
  const copy = structuredClone(s) as unknown as Json;
  for (const p of SECRET_PATHS) {
    const v = getPath(copy, p);
    if (typeof v === "string") setPath(copy, p, fn(v));
  }
  const custom = (copy.integrations as Json).custom;
  if (Array.isArray(custom)) {
    (copy.integrations as Json).custom = custom.map((c) => ({ ...(c as Json), authValue: fn(String((c as Json).authValue ?? "")) }));
  }
  return copy as unknown as AppSettings;
}

/** Overlay environment variables for anything the owner hasn't set in the console. */
function withEnvFallback(s: AppSettings): AppSettings {
  const env = process.env;
  const i = s.integrations;
  return {
    ...s,
    integrations: {
      ...i,
      stripe: {
        secretKey: i.stripe.secretKey || env.STRIPE_SECRET_KEY || "",
        publishableKey: i.stripe.publishableKey || env.STRIPE_PUBLISHABLE_KEY || "",
        webhookSecret: i.stripe.webhookSecret || env.STRIPE_WEBHOOK_SECRET || "",
      },
      google: {
        ...i.google,
        browserKey: i.google.browserKey || env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || env.GOOGLE_MAPS_API_KEY || "",
        serverKey: i.google.serverKey || env.GOOGLE_MAPS_API_KEY || "",
      },
      openChargeMap: { apiKey: i.openChargeMap.apiKey || env.OPENCHARGEMAP_API_KEY || "" },
      routing: { osrmUrl: i.routing.osrmUrl || env.OSRM_URL || DEFAULT_SETTINGS.integrations.routing.osrmUrl },
      places: { overpassUrl: i.places.overpassUrl || env.OVERPASS_URL || DEFAULT_SETTINGS.integrations.places.overpassUrl },
      geocoding: {
        nominatimUrl: i.geocoding.nominatimUrl || env.NOMINATIM_URL || DEFAULT_SETTINGS.integrations.geocoding.nominatimUrl,
      },
      tiles: {
        url: i.tiles.url || env.NEXT_PUBLIC_TILE_URL || DEFAULT_SETTINGS.integrations.tiles.url,
        attribution: i.tiles.attribution || env.NEXT_PUBLIC_TILE_ATTRIBUTION || DEFAULT_SETTINGS.integrations.tiles.attribution,
      },
      email: {
        provider: i.email.provider !== "none" ? i.email.provider : env.RESEND_API_KEY ? "resend" : "none",
        apiKey: i.email.apiKey || env.RESEND_API_KEY || "",
        from: i.email.from || env.EMAIL_FROM || "",
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

/* The cache lives on globalThis so every route bundle shares (and invalidates) the same copy. */
type LiveCache = { value: AppSettings; at: number } | null;
declare global {
  var __routediscoverLiveSettings: LiveCache | undefined;
}
const LIVE_TTL_MS = 5_000;
const getCache = (): LiveCache => globalThis.__routediscoverLiveSettings ?? null;
const setCache = (v: LiveCache) => {
  globalThis.__routediscoverLiveSettings = v;
};

async function readScope(scope: "draft" | "live"): Promise<{ data: AppSettings; updatedAt: Date | null; publishedAt: Date | null }> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.scope, scope) });
  const data = deepMerge(structuredClone(DEFAULT_SETTINGS), row?.data ?? {});
  return { data, updatedAt: row?.updatedAt ?? null, publishedAt: row?.publishedAt ?? null };
}

/** Decrypted live settings with env fallbacks: what the app runs on. */
export async function getLiveSettings(): Promise<AppSettings> {
  const cached = getCache();
  if (cached && Date.now() - cached.at < LIVE_TTL_MS) return cached.value;
  const { data } = await readScope("live");
  const value = withEnvFallback(mapSecrets(data, decrypt));
  setCache({ value, at: Date.now() });
  return value;
}

export function invalidateLiveSettings() {
  setCache(null);
}

/** Draft for the console: secrets are masked, never sent to the browser. */
export async function getDraftForConsole() {
  const draft = await readScope("draft");
  const live = await readScope("live");
  const masked = mapSecrets(mapSecrets(draft.data, decrypt), maskSecret);
  return {
    draft: masked,
    draftUpdatedAt: draft.updatedAt,
    livePublishedAt: live.publishedAt,
    hasUnpublishedChanges: JSON.stringify(draft.data) !== JSON.stringify(live.data),
    envFallbacks: {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      google: !!process.env.GOOGLE_MAPS_API_KEY,
      openChargeMap: !!process.env.OPENCHARGEMAP_API_KEY,
      email: !!process.env.RESEND_API_KEY,
    },
  };
}

const MASK_RE = /^.{0,4}••••.{0,4}$|^••••$/;

/**
 * Merge a patch from the console into the draft. Secret fields that still
 * carry the mask are left untouched; new values are encrypted.
 */
export async function saveDraft(patch: Json): Promise<AppSettings> {
  const db = await getDb();
  const { data: current } = await readScope("draft");
  const merged = deepMerge(current, patch) as AppSettings;
  const next = structuredClone(merged) as unknown as Json;
  for (const p of SECRET_PATHS) {
    const incoming = getPath(patch, p);
    const existing = getPath(current as unknown as Json, p);
    if (typeof incoming !== "string" || MASK_RE.test(incoming)) setPath(next, p, existing ?? "");
    else setPath(next, p, incoming ? encrypt(incoming) : "");
  }
  const customIn = (patch.integrations as Json | undefined)?.custom;
  if (Array.isArray(customIn)) {
    const prev = current.integrations.custom;
    (next.integrations as Json).custom = customIn.map((c) => {
      const row = c as Json;
      const old = prev.find((o) => o.id === row.id);
      const v = String(row.authValue ?? "");
      const authValue = MASK_RE.test(v) ? (old?.authValue ?? "") : v ? (isEncrypted(v) ? v : encrypt(v)) : "";
      return { ...row, authValue };
    });
  }
  await db
    .insert(schema.settings)
    .values({ scope: "draft", data: next, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.settings.scope, set: { data: next, updatedAt: new Date() } });
  return next as unknown as AppSettings;
}

/** "Go live": copy the draft over the live settings. */
export async function publishDraft(): Promise<void> {
  const db = await getDb();
  const { data } = await readScope("draft");
  const now = new Date();
  await db
    .insert(schema.settings)
    .values({ scope: "live", data: data as unknown as Json, updatedAt: now, publishedAt: now })
    .onConflictDoUpdate({
      target: schema.settings.scope,
      set: { data: data as unknown as Json, updatedAt: now, publishedAt: now },
    });
  invalidateLiveSettings();
}

/** Write directly to both draft and live (used when Stripe ids are created server-side). */
export async function patchLiveAndDraft(patch: Json): Promise<void> {
  await saveDraft(patch);
  const db = await getDb();
  const { data: live } = await readScope("live");
  const next = deepMerge(live, patch) as unknown as Json;
  await db
    .insert(schema.settings)
    .values({ scope: "live", data: next, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.settings.scope, set: { data: next, updatedAt: new Date() } });
  invalidateLiveSettings();
}

export const formatPrice = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
