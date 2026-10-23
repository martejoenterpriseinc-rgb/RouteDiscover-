import { requireUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { handle, json } from "@/lib/http";
import { referralSummary } from "@/lib/referrals";
import { getLiveSettings } from "@/lib/settings";
import { siteOrigin } from "@/lib/site";

export async function GET() {
  try {
    const user = await requireUser();
    const s = await getLiveSettings();
    const access = await getAccess(user);
    const eligible = user.role === "owner" || !s.referrals.referrerMustBePaid || access.paid;
    return json({
      program: { ...s.referrals, currency: s.pricing.currency, model: s.pricing.model, passDays: s.pricing.passDays, priceCents: s.pricing.monthlyPriceCents },
      eligible,
      paid: access.paid,
      link: `${await siteOrigin()}/invite/${user.referralCode}`,
      code: user.referralCode,
      summary: await referralSummary(user.id),
    });
  } catch (err) {
    return handle(err);
  }
}
