import "server-only";
import { headers } from "next/headers";

/** Canonical production origin. Override with NEXT_PUBLIC_SITE_URL for staging or local work. */
export const CANONICAL_ORIGIN = "https://routediscover.com";

/** Public origin for links we hand out (share links, invites, Stripe return URLs). */
export async function siteOrigin(): Promise<string> {
  const fixed = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fixed) return fixed;
  if (process.env.NODE_ENV === "production" && !process.env.ROUTEDISCOVER_ALLOW_HOST_ORIGIN) return CANONICAL_ORIGIN;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
