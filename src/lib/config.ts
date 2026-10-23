/**
 * Runtime configuration. Everything has a free default so the app runs with
 * no keys; set values in `.env.local` to point at your own services.
 */
export type DataMode = "auto" | "live" | "demo";

export const config = {
  /**
   * auto  – try live providers, fall back to bundled demo data (flagged in UI)
   * live  – live providers only; errors surface to the caller
   * demo  – bundled demo data only (offline / development)
   */
  dataMode: ((process.env.ROUTEDISCOVER_DATA_MODE as DataMode) || "auto") as DataMode,
  osrmUrl: process.env.OSRM_URL || "https://router.project-osrm.org",
  overpassUrl: process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter",
  nominatimUrl: process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org",
  openChargeMapUrl: process.env.OPENCHARGEMAP_URL || "https://api.openchargemap.io/v3",
  openChargeMapKey: process.env.OPENCHARGEMAP_API_KEY || "",
  /** Identify ourselves to the public OSM services, as their usage policies ask. */
  userAgent: process.env.ROUTEDISCOVER_USER_AGENT || "RouteDiscover/0.1 (https://github.com/martejoenterpriseinc-rgb/RouteDiscover-)",
  fetchTimeoutMs: Number(process.env.ROUTEDISCOVER_FETCH_TIMEOUT_MS || 25000),
};

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
): Promise<{ source: "live" | "demo"; data: T; notice?: string }> {
  if (config.dataMode === "demo") {
    return { source: "demo", data: await demo(), notice: "Demo data mode is on." };
  }
  try {
    return { source: "live", data: await live() };
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
