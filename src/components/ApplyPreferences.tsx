"use client";

import { useEffect } from "react";
import type { Preferences } from "@/db/schema";
import { useTrip } from "@/hooks/useTrip";

/** Seeds the shared trip store with the signed-in user's saved preferences. */
export function ApplyPreferences({ prefs }: { prefs: Preferences }) {
  const { trip, update } = useTrip();
  useEffect(() => {
    const patch: Parameters<typeof update>[0] = { preferences: prefs };
    if (!trip.route && !trip.radiusTouched) patch.radiusMiles = prefs.radiusMiles;
    update(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(prefs)]);
  return null;
}
