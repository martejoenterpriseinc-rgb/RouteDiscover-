import { json } from "@/lib/http";
import { getLiveSettings } from "@/lib/settings";

export type MapConfig = { provider: "google" | "osm"; googleKey?: string; tileUrl: string; attribution: string };

/** Public map configuration for the browser. Only the referrer-restricted browser key is exposed. */
export async function GET() {
  const s = await getLiveSettings();
  const g = s.integrations.google;
  const googleKey = g.mapEnabled ? g.browserKey : "";
  const cfg: MapConfig = {
    provider: googleKey ? "google" : "osm",
    googleKey: googleKey || undefined,
    tileUrl: s.integrations.tiles.url,
    attribution: s.integrations.tiles.attribution,
  };
  return json(cfg, { headers: { "Cache-Control": "private, max-age=60" } });
}
