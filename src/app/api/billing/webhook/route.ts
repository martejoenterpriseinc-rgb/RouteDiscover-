import { fail, json } from "@/lib/http";
import { getLiveSettings } from "@/lib/settings";
import { getStripe, handleStripeEvent } from "@/lib/stripe";

/**
 * Stripe → RouteDiscover. Point the Stripe webhook at /api/billing/webhook
 * with events: customer.subscription.*, checkout.session.completed,
 * invoice.payment_failed. The signing secret lives in the owner console.
 */
export async function POST(req: Request) {
  const s = await getLiveSettings();
  const stripe = await getStripe(s);
  const secret = s.integrations.stripe.webhookSecret;
  if (!stripe || !secret) return fail("Stripe webhook is not configured.", 503);
  const sig = req.headers.get("stripe-signature");
  if (!sig) return fail("Missing signature.", 400);
  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return fail(`Invalid signature: ${err instanceof Error ? err.message : "unknown"}`, 400);
  }
  try {
    const result = await handleStripeEvent(event);
    return json({ received: true, result });
  } catch (err) {
    console.error("[stripe webhook]", err);
    return fail("Handler failed.", 500);
  }
}
