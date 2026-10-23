import type { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth";
import { handle, json } from "@/lib/http";
import { referralProgramStats } from "@/lib/referrals";
import { getLiveSettings } from "@/lib/settings";

export async function GET(req: NextRequest) {
  try {
    await requireOwner();
    const days = Math.min(365, Math.max(7, Number(req.nextUrl.searchParams.get("days") || 30)));
    const s = await getLiveSettings();
    return json({ days, program: s.referrals, currency: s.pricing.currency, stats: await referralProgramStats(new Date(Date.now() - days * 86400_000)) });
  } catch (err) {
    return handle(err);
  }
}
