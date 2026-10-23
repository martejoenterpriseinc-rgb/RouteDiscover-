import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://routediscover.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/t/"], disallow: ["/app/", "/owner/", "/api/", "/login", "/signup"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
