"use client";

import { useEffect, useState } from "react";
import type { PublicStats } from "@/lib/public-stats";

const fmt = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString());

/** Community KPIs: travelers, businesses claimed, active trips. */
export function KpiStrip({ stats, compact = false }: { stats: PublicStats; compact?: boolean }) {
  const items = [
    { label: "Travelers", value: stats.travelers, icon: "🧭" },
    { label: "Businesses claimed", value: stats.businessesClaimed, icon: "🏪" },
    { label: "Active trips", value: stats.activeTrips, icon: "🗓️" },
  ];
  return (
    <dl className={`grid grid-cols-3 ${compact ? "gap-2" : "gap-3"}`} aria-label="Community stats">
      {items.map((i) => (
        <div key={i.label} className={`rounded-2xl border border-border bg-surface text-center shadow-sm ${compact ? "p-2" : "p-4"}`}>
          <dd className={`font-extrabold tracking-tight text-navy dark:text-sky ${compact ? "text-xl" : "text-3xl"}`}>
            <span aria-hidden className="mr-1">{i.icon}</span>
            {fmt(i.value)}
          </dd>
          <dt className={`text-muted ${compact ? "text-[11px]" : "text-xs font-semibold uppercase tracking-wide"}`}>{i.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/** Same strip, fetching its own numbers (for client pages). */
export function KpiStripLive({ compact = false }: { compact?: boolean }) {
  const [stats, setStats] = useState<PublicStats | null>(null);
  useEffect(() => {
    fetch("/api/stats/public")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);
  if (!stats) return null;
  return <KpiStrip stats={stats} compact={compact} />;
}
