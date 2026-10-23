"use client";

import { useEffect, useState } from "react";
import type { MapConfig } from "@/app/api/config/map/route";

let cached: MapConfig | null = null;
let inflight: Promise<MapConfig> | null = null;

const FALLBACK: MapConfig = {
  provider: "osm",
  tileUrl: process.env.NEXT_PUBLIC_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: process.env.NEXT_PUBLIC_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

export function loadMapConfig(): Promise<MapConfig> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch("/api/config/map")
      .then((r) => (r.ok ? (r.json() as Promise<MapConfig>) : FALLBACK))
      .then((c) => {
        cached = c;
        return c;
      })
      .catch(() => FALLBACK);
  }
  return inflight;
}

export function useMapConfig(): MapConfig | null {
  const [cfg, setCfg] = useState<MapConfig | null>(cached);
  useEffect(() => {
    if (!cached) loadMapConfig().then(setCfg);
  }, []);
  return cfg;
}

/** Loads the Google Maps JavaScript API once. */
let gmapsPromise: Promise<boolean> | null = null;
export function loadGoogleMaps(key: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as unknown as { google?: { maps?: unknown } }).google?.maps) return Promise.resolve(true);
  if (!gmapsPromise) {
    gmapsPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async`;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
      setTimeout(() => resolve(false), 15000);
    });
  }
  return gmapsPromise;
}
