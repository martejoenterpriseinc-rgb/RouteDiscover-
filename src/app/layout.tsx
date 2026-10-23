import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://routediscover.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RouteDiscover",
    template: "%s · RouteDiscover",
  },
  description:
    "Discover what's worth stopping for along your drive: attractions, food, Tesla Superchargers, and hotels with EV charging, all within the miles you choose.",
  applicationName: "RouteDiscover",
  appleWebApp: { capable: true, title: "RouteDiscover", statusBarStyle: "default" },
  openGraph: {
    title: "RouteDiscover",
    description: "Find everything worth stopping for along your route.",
    url: SITE_URL,
    siteName: "RouteDiscover",
    images: ["/brand/og.png"],
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "RouteDiscover", description: "Find everything worth stopping for along your route.", images: ["/brand/og.png"] },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#1c2b5a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
