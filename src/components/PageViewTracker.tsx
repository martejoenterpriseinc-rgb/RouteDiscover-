"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Records one page_view per client-side navigation: path, referrer host, UTM tags and
 * device class. Nothing personal is sent; the server adds the anonymous visitor cookie.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    if (navigator.webdriver) return; // headless browsers and crawlers that identify themselves
    const u = new URL(window.location.href);
    const ref = document.referrer ? (() => { try { return new URL(document.referrer).host; } catch { return ""; } })() : "";
    const w = window.innerWidth;
    const meta: Record<string, string> = {
      path: pathname,
      ref: ref && ref !== u.host ? ref : "",
      device: w < 640 ? "phone" : w < 1024 ? "tablet" : "desktop",
    };
    for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
      const v = u.searchParams.get(k);
      if (v) meta[k] = v.slice(0, 60);
    }
    const body = JSON.stringify({ type: "page_view", meta });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    else void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
  }, [pathname]);
  return null;
}
