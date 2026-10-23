import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppNav } from "@/components/AppNav";

export const metadata: Metadata = {
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
    images: ["/brand/og.png"],
    type: "website",
  },
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
      <body className="min-h-full flex flex-col">
        <AppNav />
        <main className="flex-1 flex flex-col pb-16 md:pb-0">{children}</main>
      </body>
    </html>
  );
}
