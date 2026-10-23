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
  | "settings_published"
  | "business_view"
  | "business_impression"
  | "business_click"
  | "business_claimed"
  | "sponsor_purchased"
  | "stop_added"
  | "submission_created"
  | "submission_moderated"
  | "user_banned"
  | "pass_purchased"
  | "trial_started"
  | "referral_payment"
  | "referral_rewarded"
  | "send_to_phone"
  | "account_requested"
  | "account_request_approved"
  | "account_request_declined"
  | "page_view"
  | "event_submitted"
  | "event_moderated";

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
