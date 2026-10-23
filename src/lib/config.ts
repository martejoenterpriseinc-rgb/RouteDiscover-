/**
 * Runtime configuration for the data providers. Values come from the owner's
 * live settings (console) with environment-variable fallbacks; everything has
 * a free default so the app runs with no keys.
 */
import { getLiveSettings } from "./settings";

export type DataMode = "auto" | "live" | "demo";

export const config = {
  /**
   * auto  – try live providers, fall back to bundled demo data (flagged in UI)
   * live  – live providers only; errors surface to the caller
   * demo  – bundled demo data only (offline / development)
   */
  dataMode: ((process.env.ROUTEDISCOVER_DATA_MODE as DataMode) || "auto") as DataMode,
  /** Identify ourselves to the public OSM services, as their usage policies ask. */
  userAgent:
    process.env.ROUTEDISCOVER_USER_AGENT ||
    "RouteDiscover/0.1 (https://github.com/martejoenterpriseinc-rgb/RouteDiscover-)",
  fetchTimeoutMs: Number(process.env.ROUTEDISCOVER_FETCH_TIMEOUT_MS || 25000),
};

export type GoogleConfig = { serverKey: string; places: boolean; routing: boolean; geocoding: boolean; maxRequestsPerSearch: number };

export type ProviderConfig = {
  google: GoogleConfig;
  osrmUrl: string;
  overpassUrl: string;
  nominatimUrl: string;
  openChargeMapUrl: string;
  openChargeMapKey: string;
};

export async function getProviderConfig(): Promise<ProviderConfig> {
  const s = await getLiveSettings();
  const g = s.integrations.google;
  const serverKey = g.serverKey || g.browserKey;
  return {
    google: {
      serverKey,
      places: !!serverKey && g.placesEnabled,
      routing: !!serverKey && g.routingEnabled,
      geocoding: !!serverKey && g.geocodingEnabled,
      maxRequestsPerSearch: Math.max(1, Math.min(60, g.maxRequestsPerSearch || 12)),
    },
    osrmUrl: s.integrations.routing.osrmUrl.replace(/\/$/, ""),
    overpassUrl: s.integrations.places.overpassUrl,
    nominatimUrl: s.integrations.geocoding.nominatimUrl.replace(/\/$/, ""),
    openChargeMapUrl: process.env.OPENCHARGEMAP_URL || "https://api.openchargemap.io/v3",
    openChargeMapKey: s.integrations.openChargeMap.apiKey,
  };
}

export async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), config.fetchTimeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "User-Agent": config.userAgent, ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

export class ProviderError extends Error {
  constructor(
    public provider: string,
    message: string,
  ) {
    super(`${provider}: ${message}`);
  }
}

/**
 * Run a live provider with demo fallback according to the data mode.
 * Returns the data plus which source produced it, so the UI can flag demo data.
 */
export async function withFallback<T>(
  provider: string,
  live: () => Promise<T>,
  demo: () => Promise<T> | T,
  /** Optional preferred provider tried first (Google); falls through to `live` on failure. */
  primary?: { name: string; run: () => Promise<T> } | null,
): Promise<{ source: "live" | "demo"; data: T; notice?: string; via?: string }> {
  if (config.dataMode === "demo") {
    return { source: "demo", data: await demo(), notice: "Demo data mode is on." };
  }
  if (primary) {
    try {
      return { source: "live", data: await primary.run(), via: primary.name };
    } catch (err) {
      console.warn(`[routediscover] ${primary.name} failed, falling back to ${provider}: ${err instanceof Error ? err.message : err}`);
    }
  }
  try {
    return { source: "live", data: await live(), via: provider };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (config.dataMode === "live") throw new ProviderError(provider, msg);
    console.warn(`[routediscover] ${provider} unavailable, using demo data: ${msg}`);
    return {
      source: "demo",
      data: await demo(),
      notice: `${provider} was unreachable, showing sample data instead.`,
    };
  }
}
