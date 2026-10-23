import { requireOwner } from "@/lib/auth";
import { handle, json } from "@/lib/http";
import { getLiveSettings } from "@/lib/settings";
import { usageReport } from "@/lib/usage";

/** This month's external API usage against the owner's caps, plus which provider is live for each feature. */
export async function GET() {
  try {
    await requireOwner();
    const s = await getLiveSettings();
    const g = s.integrations.google;
    const serverKey = g.serverKey || g.browserKey;
    const report = await usageReport();
    const google = report.providers.google ?? {};
    const caps = g.caps;
    const used = (k: keyof typeof caps) => google[k] ?? 0;
    const capped = (k: keyof typeof caps) => caps[k] > 0 && used(k) >= caps[k];
    return json({
      month: report.month,
      usage: { places: used("places"), routes: used("routes"), geocoding: used("geocoding"), photos: used("photos") },
      caps,
      active: {
        map: g.browserKey && g.mapEnabled ? "Google Maps" : "OpenStreetMap tiles",
        places: serverKey && g.placesEnabled && !capped("places") ? "Google Places" : "OpenStreetMap (Overpass)",
        routing: serverKey && g.routingEnabled && !capped("routes") ? "Google Routes" : "OSRM",
        geocoding: serverKey && g.geocodingEnabled && !capped("geocoding") ? "Google Geocoding" : "Nominatim",
        chargers: s.integrations.openChargeMap.apiKey ? "Open Charge Map (keyed)" : "Open Charge Map (public)",
      },
      capped: { places: capped("places"), routes: capped("routes"), geocoding: capped("geocoding"), photos: capped("photos") },
    });
  } catch (err) {
    return handle(err);
  }
}
