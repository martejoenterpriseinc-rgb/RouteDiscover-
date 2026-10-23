import { requireOwner } from "@/lib/auth";
import { track } from "@/lib/events";
import { handle, json } from "@/lib/http";
import { getDraftForConsole, getLiveSettings, publishDraft } from "@/lib/settings";
import { syncStripePrice } from "@/lib/stripe";

/** "Go live": promote the draft, then make sure Stripe carries the published price. */
export async function POST() {
  try {
    const owner = await requireOwner();
    await publishDraft();
    const warnings: string[] = [];
    let stripe: { productId: string; priceId: string; created: boolean } | null = null;
    const live = await getLiveSettings();
    if (live.integrations.stripe.secretKey) {
      try {
        stripe = await syncStripePrice();
      } catch (err) {
        warnings.push(`Stripe price sync failed: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    } else if (live.pricing.requireSubscription) {
      warnings.push("Subscriptions are required but Stripe is not connected, so everyone still gets free access.");
    }
    await track("settings_published", { userId: owner.id, meta: { stripeSynced: !!stripe } });
    return json({ ok: true, warnings, stripe, console: await getDraftForConsole() });
  } catch (err) {
    return handle(err);
  }
}
