import Stripe from "stripe";
import { requireOwner } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { body, fail, handle, json, str } from "@/lib/http";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings";

type Result = { ok: boolean; message: string; ms: number };

async function timed(fn: () => Promise<string>): Promise<Result> {
  const t0 = Date.now();
  try {
    const message = await fn();
    return { ok: true, message, ms: Date.now() - t0 };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err), ms: Date.now() - t0 };
  }
}

async function withTimeout(url: string, init: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, headers: { "User-Agent": "RouteDiscover/console-test", ...(init.headers || {}) } });
  } finally {
    clearTimeout(t);
  }
}

/** Decrypted DRAFT settings, so the owner can test keys before going live. */
async function draftSettings(): Promise<AppSettings> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.scope, "draft") });
  const merged = JSON.parse(JSON.stringify({ ...DEFAULT_SETTINGS, ...(row?.data ?? {}) })) as AppSettings;
  merged.integrations = { ...DEFAULT_SETTINGS.integrations, ...(row?.data as Partial<AppSettings> | undefined)?.integrations };
  const i = merged.integrations;
  i.stripe = { ...DEFAULT_SETTINGS.integrations.stripe, ...i.stripe, secretKey: decrypt(i.stripe?.secretKey ?? "") || process.env.STRIPE_SECRET_KEY || "", webhookSecret: decrypt(i.stripe?.webhookSecret ?? "") };
  i.openChargeMap = { apiKey: decrypt(i.openChargeMap?.apiKey ?? "") || process.env.OPENCHARGEMAP_API_KEY || "" };
  i.google = { ...DEFAULT_SETTINGS.integrations.google, ...i.google, serverKey: decrypt(i.google?.serverKey ?? "") || i.google?.browserKey || process.env.GOOGLE_MAPS_API_KEY || "" };
  i.email = { ...DEFAULT_SETTINGS.integrations.email, ...i.email, apiKey: decrypt(i.email?.apiKey ?? "") || process.env.RESEND_API_KEY || "" };
  i.sms = { ...DEFAULT_SETTINGS.integrations.sms, ...i.sms, authToken: decrypt(i.sms?.authToken ?? "") || process.env.TWILIO_AUTH_TOKEN || "" };
  i.custom = (i.custom ?? []).map((c) => ({ ...c, authValue: decrypt(c.authValue ?? "") }));
  return merged;
}

/** POST { target, id? } → connection test against the draft configuration. */
export async function POST(req: Request) {
  const b = await body(req);
  try {
    await requireOwner();
    const target = str(b.target, 30);
    const s = await draftSettings();
    const i = s.integrations;
    let result: Result;
    switch (target) {
      case "stripe":
        result = await timed(async () => {
          if (!i.stripe.secretKey) throw new Error("No secret key saved.");
          const stripe = new Stripe(i.stripe.secretKey);
          const balance = await stripe.balance.retrieve();
          const mode = i.stripe.secretKey.startsWith("sk_live") ? "LIVE" : "test";
          return `Connected to Stripe (${mode} mode, ${balance.livemode ? "live" : "test"} data).${i.stripe.webhookSecret ? "" : " Add the webhook signing secret to receive subscription updates."}`;
        });
        break;
      case "google":
        result = await timed(async () => {
          if (!i.google.serverKey) throw new Error("No Google key saved.");
          const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
          url.searchParams.set("address", "Lancaster, PA");
          url.searchParams.set("key", i.google.serverKey);
          const res = await withTimeout(url.toString());
          const j = (await res.json()) as { status: string; error_message?: string; results?: Array<{ formatted_address: string }> };
          if (j.status !== "OK") throw new Error(`${j.status}${j.error_message ? `: ${j.error_message}` : ""}`);
          const places = await withTimeout("https://places.googleapis.com/v1/places:searchNearby", { method: "POST", headers: { "X-Goog-Api-Key": i.google.serverKey, "X-Goog-FieldMask": "places.id", "Content-Type": "application/json" }, body: JSON.stringify({ includedTypes: ["restaurant"], maxResultCount: 1, locationRestriction: { circle: { center: { latitude: 40.0379, longitude: -76.3055 }, radius: 2000 } } }) });
          return `Geocoding OK (${j.results?.[0]?.formatted_address}). Places API (New): ${places.ok ? "OK" : `HTTP ${places.status}, enable “Places API (New)” for this key`}.`;
        });
        break;
      case "openChargeMap":
        result = await timed(async () => {
          const url = new URL("https://api.openchargemap.io/v3/poi/");
          url.searchParams.set("output", "json");
          url.searchParams.set("maxresults", "1");
          url.searchParams.set("latitude", "40.0379");
          url.searchParams.set("longitude", "-76.3055");
          const res = await withTimeout(url.toString(), { headers: i.openChargeMap.apiKey ? { "X-API-Key": i.openChargeMap.apiKey } : {} });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return `Open Charge Map responded${i.openChargeMap.apiKey ? " with your API key" : " (no key: public rate limits apply)"}.`;
        });
        break;
      case "routing":
        result = await timed(async () => {
          const res = await withTimeout(`${i.routing.osrmUrl.replace(/\/$/, "")}/route/v1/driving/-87.6298,41.8781;-76.3055,40.0379?overview=false`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const j = (await res.json()) as { routes?: Array<{ distance: number }> };
          return `OSRM routed Chicago → Lancaster: ${Math.round((j.routes?.[0]?.distance ?? 0) / 1609)} mi.`;
        });
        break;
      case "places":
        result = await timed(async () => {
          const res = await withTimeout(i.places.overpassUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `data=${encodeURIComponent('[out:json][timeout:10];node(around:300,40.0379,-76.3055)["tourism"];out 1;')}` });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return "Overpass responded.";
        });
        break;
      case "geocoding":
        result = await timed(async () => {
          const res = await withTimeout(`${i.geocoding.nominatimUrl.replace(/\/$/, "")}/search?q=Lancaster%20PA&format=jsonv2&limit=1`, { headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const j = (await res.json()) as Array<{ display_name: string }>;
          return `Geocoder found: ${j[0]?.display_name ?? "nothing"}`;
        });
        break;
      case "tiles":
        result = await timed(async () => {
          const url = i.tiles.url.replace("{s}", "a").replace("{z}", "5").replace("{x}", "9").replace("{y}", "12");
          const res = await withTimeout(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return `Tile server responded (${res.headers.get("content-type") ?? "image"}).`;
        });
        break;
      case "email":
        result = await timed(async () => {
          if (i.email.provider !== "resend" || !i.email.apiKey) throw new Error("Choose Resend and save an API key first.");
          const res = await withTimeout("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${i.email.apiKey}` } });
          if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
          return `Resend accepted the key.${i.email.from ? "" : " Set a From address."}`;
        });
        break;
      case "sms":
        result = await timed(async () => {
          if (i.sms.provider !== "twilio" || !i.sms.accountSid || !i.sms.authToken) throw new Error("Choose Twilio and save the Account SID and auth token first.");
          const res = await withTimeout(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(i.sms.accountSid)}.json`, { headers: { Authorization: `Basic ${Buffer.from(`${i.sms.accountSid}:${i.sms.authToken}`).toString("base64")}` } });
          if (!res.ok) throw new Error(`Twilio HTTP ${res.status}`);
          const j = (await res.json()) as { friendly_name?: string; status?: string };
          return `Twilio account ${j.friendly_name ?? i.sms.accountSid} (${j.status ?? "ok"}).${i.sms.from ? "" : " Set a From number."}`;
        });
        break;
      case "custom": {
        const id = str(b.id, 64);
        const c = i.custom.find((x) => x.id === id);
        if (!c) return fail("Unknown custom API.");
        result = await timed(async () => {
          if (!/^https?:\/\//.test(c.baseUrl)) throw new Error("Base URL must start with http:// or https://");
          const headers: Record<string, string> = {};
          if (c.authHeader && c.authValue) headers[c.authHeader] = c.authValue;
          const res = await withTimeout(c.baseUrl, { headers });
          return `${c.name || "API"} responded HTTP ${res.status}.`;
        });
        break;
      }
      default:
        return fail("Unknown test target.");
    }
    return json(result);
  } catch (err) {
    return handle(err);
  }
}
