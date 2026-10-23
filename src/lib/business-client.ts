"use client";

import type { PresentedBusiness, PlanSummary } from "./business";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
  return j;
}

export type MyBusiness = PresentedBusiness & { plan: PlanSummary };
export type QueueItem = {
  id: string;
  type: "review" | "photo" | "menu" | "special" | "hours" | "info";
  payload: { text?: string; rating?: number; photoId?: string; caption?: string; field?: string; value?: string };
  status: "pending" | "approved" | "rejected";
  riskScore: number;
  riskFlags: string[];
  flagged: boolean;
  createdAt: string;
  author: string;
};
export type Traffic = { days: number; views: number; impressions: number; clicks: Record<string, number>; tripAdds: number; series: Array<{ day: string; value: number }>; submissions: { pending: number; approved: number } };

export const myBusinesses = () => call<{ businesses: MyBusiness[] }>("/api/business/mine").then((r) => r.businesses);
export const updateBusiness = (id: string, patch: Record<string, string | null>) => call<{ business: PresentedBusiness }>(`/api/business/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).then((r) => r.business);
export const syncBusiness = (id: string) => call<{ business: PresentedBusiness; changed: string[]; source: "live" | "demo" }>(`/api/business/${id}/sync`, { method: "POST" });
export const businessTraffic = (id: string, days = 30) => call<Traffic>(`/api/business/${id}/traffic?days=${days}`);
export const businessQueue = (id: string) => call<{ queue: QueueItem[]; heldForAudit: number }>(`/api/business/${id}/queue`);
export const moderateSubmission = (id: string, submissionId: string, decision: "approved" | "rejected", note?: string) =>
  call<{ submission: QueueItem }>(`/api/business/${id}/moderate`, { method: "POST", body: JSON.stringify({ submissionId, decision, note }) });

export const TYPE_LABEL: Record<QueueItem["type"], string> = { review: "Review", photo: "Photo", menu: "Menu", special: "Special", hours: "Hours", info: "Correction" };

export function describe(item: QueueItem): string {
  const p = item.payload;
  switch (item.type) {
    case "review":
      return `${"★".repeat(p.rating ?? 0)} ${p.text ?? ""}`.trim();
    case "photo":
      return p.caption ? `Photo: ${p.caption}` : "Photo";
    case "hours":
      return `Hours → ${p.value}${p.text ? ` (${p.text})` : ""}`;
    case "info":
      return `${p.field} → ${p.value}${p.text ? ` (${p.text})` : ""}`;
    default:
      return p.text ?? "";
  }
}
