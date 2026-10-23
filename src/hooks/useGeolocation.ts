"use client";

import { useCallback, useState } from "react";
import type { LatLng } from "@/lib/types";

export function useGeolocation() {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const locate = useCallback(
    () =>
      new Promise<LatLng | null>((resolve) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          setError("Location is not available in this browser.");
          resolve(null);
          return;
        }
        setLoading(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setPosition(p);
            setLoading(false);
            resolve(p);
          },
          (err) => {
            setError(err.message || "Could not get your location.");
            setLoading(false);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
        );
      }),
    [],
  );

  return { position, error, loading, locate };
}
