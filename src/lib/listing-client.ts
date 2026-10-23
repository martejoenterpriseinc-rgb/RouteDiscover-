"use client";

import type { ListingView } from "./listing-view";
import type { Place } from "./types";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }, ...init });
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
  return j;
}

export const ensureListing = (place: Place) => call<{ id: string }>("/api/listings", { method: "POST", body: JSON.stringify({ place }) }).then((r) => r.id);
export const getListing = (id: string) => call<ListingView>(`/api/listings/${id}`);
export const trackClick = (id: string, kind: string) => fetch(`/api/listings/${id}/click`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }), keepalive: true }).catch(() => {});
export const submitUpdate = (id: string, body: Record<string, unknown>) => call<{ ok: true; submission: { id: string; status: string; flagged: boolean } }>(`/api/listings/${id}/submissions`, { method: "POST", body: JSON.stringify(body) });
export const uploadPhoto = (id: string, file: File, caption: string) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("caption", caption);
  return call<{ ok: true; photoId: string; status: string }>(`/api/listings/${id}/photos`, { method: "POST", body: fd });
};
export const claimBusiness = (businessId: string, plan: "basic" | "sponsor") => call<{ url?: string; granted?: boolean; notice?: string }>("/api/business/claim", { method: "POST", body: JSON.stringify({ businessId, plan }) });
export const money = (cents: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
