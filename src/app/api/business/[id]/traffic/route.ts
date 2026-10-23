import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { businessTraffic, canManage, getBusiness } from "@/lib/business";
import { fail, handle, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    const business = await getBusiness((await params).id);
    if (!business) return fail("Listing not found.", 404);
    if (!canManage(user, business)) return fail("You don't manage this business.", 403);
    const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get("days") || 30)));
    return json(await businessTraffic(business, days));
  } catch (err) {
    return handle(err);
  }
}
