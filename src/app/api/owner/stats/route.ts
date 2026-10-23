import type { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth";
import { handle, json } from "@/lib/http";
import { getOwnerStats } from "@/lib/stats";

export async function GET(req: NextRequest) {
  try {
    await requireOwner();
    const days = Math.min(365, Math.max(7, Number(req.nextUrl.searchParams.get("days") || 30)));
    return json(await getOwnerStats(days));
  } catch (err) {
    return handle(err);
  }
}
