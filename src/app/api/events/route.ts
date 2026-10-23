import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { track, type EventType } from "@/lib/events";
import { body, fail, json, str } from "@/lib/http";

/** Client-side analytics beacons. Only a small allow-list can be sent from the browser. */
const ALLOWED: EventType[] = ["landing_view", "download_click", "pwa_installed", "trip_shared"];

export async function POST(req: Request) {
  const b = await body(req);
  const type = str(b.type, 40) as EventType;
  if (!ALLOWED.includes(type)) return fail("unknown event");
  const meta: Record<string, unknown> = {};
  if (b.meta && typeof b.meta === "object") {
    for (const [k, v] of Object.entries(b.meta as Record<string, unknown>).slice(0, 10)) {
      if (typeof v === "string") meta[k] = v.slice(0, 120);
      else if (typeof v === "number" || typeof v === "boolean") meta[k] = v;
    }
  }
  const user = await getCurrentUser().catch(() => null);
  const anonId = (await cookies()).get("rd_anon")?.value ?? null;
  await track(type, { userId: user?.id ?? null, anonId, meta });
  return json({ ok: true });
}
