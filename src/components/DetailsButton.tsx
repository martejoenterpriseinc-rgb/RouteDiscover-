"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ensureListing } from "@/lib/listing-client";
import type { Place } from "@/lib/types";

/** Opens the full listing (details, photos, reviews, claim) for any search result. */
export function DetailsButton({ place, listingId }: { place: Place; listingId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold hover:border-blue hover:text-blue disabled:opacity-60"
      disabled={busy}
      onClick={async (e) => {
        e.stopPropagation();
        setBusy(true);
        try {
          const id = listingId ?? (await ensureListing(place));
          router.push(`/app/place/${id}`);
        } catch {
          setBusy(false);
        }
      }}
    >
      {busy ? "Opening…" : "Details, photos & reviews →"}
    </button>
  );
}
