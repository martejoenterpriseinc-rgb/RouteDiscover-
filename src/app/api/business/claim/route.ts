import { requireUser } from "@/lib/auth";
import { getBusiness, grantPlan } from "@/lib/business";
import { body, fail, handle, json, str } from "@/lib/http";
import { getLiveSettings } from "@/lib/settings";
import { siteOrigin } from "@/lib/site";
import { createBusinessCheckout } from "@/lib/stripe";

/**
 * POST { businessId, plan: "basic" | "sponsor" }
 * → { url } to Stripe Checkout when payment is required, or { granted: true } when it isn't.
 */
export async function POST(req: Request) {
  const b = await body(req);
  try {
    const user = await requireUser();
    if (user.banned) return fail("This account can't claim businesses.", 403);
    const plan = str(b.plan, 10) === "sponsor" ? "sponsor" : "basic";
    const business = await getBusiness(str(b.businessId, 64));
    if (!business) return fail("Listing not found.", 404);
    if (business.claimStatus === "claimed" && business.claimedBy !== user.id && user.role !== "owner") {
      return fail("This business has already been claimed. Contact support if you believe that's a mistake.", 409);
    }
    const s = await getLiveSettings();
    const stripeReady = !!s.integrations.stripe.secretKey && !!s.business.stripeBasicPriceId && !!s.business.stripeSponsorPriceId;
    if (s.business.requirePayment && stripeReady) {
      const url = await createBusinessCheckout(user, business.id, plan, await siteOrigin());
      return json({ url });
    }
    const amount = plan === "basic" ? s.business.basicPriceCents : s.business.sponsorPriceCents;
    await grantPlan({ businessId: business.id, userId: user.id, plan, stripeRef: "manual", amountCents: s.business.requirePayment ? 0 : amount, currency: s.pricing.currency });
    return json({ granted: true, notice: s.business.requirePayment ? "Billing isn't connected yet, so this claim was granted without payment." : undefined });
  } catch (err) {
    return handle(err);
  }
}
