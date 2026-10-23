import type { NextRequest } from "next/server";
import { googlePhoto } from "@/lib/providers/google";

/** Proxies Google Places photos so the server key never reaches the browser. */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  if (!/^places\/[^/]+\/photos\/[^/]+$/.test(name)) return new Response("bad photo reference", { status: 400 });
  const width = Number(req.nextUrl.searchParams.get("w") || 800);
  try {
    const upstream = await googlePhoto(name, width);
    return new Response(upstream.body, { headers: { "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg", "Cache-Control": "public, max-age=86400" } });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "photo unavailable", { status: 502 });
  }
}
