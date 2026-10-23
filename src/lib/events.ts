import "server-only";
import { getDb, schema } from "@/db";

export type EventType =
  | "landing_view"
  | "signup"
  | "login"
  | "download_click"
  | "pwa_installed"
  | "trip_created"
  | "trip_shared"
  | "trip_completed"
  | "invite_sent"
  | "invite_accepted"
  | "checkout_started"
  | "subscription_started"
  | "subscription_canceled"
  | "subscription_payment_failed"
  | "route_search"
  | "settings_published";

export async function track(
  type: EventType,
  opts: { userId?: string | null; anonId?: string | null; meta?: Record<string, unknown> } = {},
) {
  try {
    const db = await getDb();
    await db.insert(schema.events).values({
      type,
      userId: opts.userId ?? null,
      anonId: opts.anonId ?? null,
      meta: opts.meta ?? {},
    });
  } catch (err) {
    console.warn("[routediscover] event not recorded:", type, err instanceof Error ? err.message : err);
  }
}
