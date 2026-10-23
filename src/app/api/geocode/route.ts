import { NextResponse, type NextRequest } from "next/server";
import { bad, handleError } from "@/lib/api";
import { geocode } from "@/lib/providers/geocode";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return bad("q must be at least 2 characters");
  try {
    const r = await geocode(q.slice(0, 200), 6);
    return NextResponse.json(r);
  } catch (err) {
    return handleError(err);
  }
}
