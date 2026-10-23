"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  // Follow mode: keep the position fresh as the device moves.
  const [following, setFollowingState] = useState(false);
  const watchId = useRef<number | null>(null);
  const setFollowing = useCallback((on: boolean) => {
    if (on && (typeof navigator === "undefined" || !navigator.geolocation)) {
      setError("Location is not available in this browser.");
      return;
    }
    setFollowingState(on);
  }, []);
  useEffect(() => {
    if (!following || typeof navigator === "undefined" || !navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setError(null);
      },
      (err) => setError(err.message || "Could not follow your location."),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [following]);

  return { position, error, loading, locate, following, setFollowing };
}
