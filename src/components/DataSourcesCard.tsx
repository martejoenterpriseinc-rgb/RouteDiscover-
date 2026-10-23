"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "./ui";

type Usage = {
  month: string;
  usage: Record<"places" | "routes" | "geocoding" | "photos", number>;
  caps: Record<"places" | "routes" | "geocoding" | "photos", number>;
  active: Record<"map" | "places" | "routing" | "geocoding" | "chargers", string>;
  capped: Record<"places" | "routes" | "geocoding" | "photos", boolean>;
};

const LABEL: Record<keyof Usage["usage"], string> = { places: "Places (search & details)", routes: "Routes", geocoding: "Geocoding", photos: "Photos" };

/** Which provider is live for each feature, and Google usage against the monthly caps. */
export function DataSourcesCard({ compact = false }: { compact?: boolean }) {
  const [u, setU] = useState<Usage | null>(null);
  useEffect(() => {
    fetch("/api/owner/usage").then((r) => (r.ok ? r.json() : null)).then(setU).catch(() => {});
  }, []);
  if (!u) return null;
  const anyGoogle = Object.values(u.active).some((v) => v.startsWith("Google"));
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Data sources</h2>
        {!compact && <Link href="/owner/integrations" className="text-xs font-semibold text-blue hover:underline">Integrations →</Link>}
      </div>
      <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        {(Object.keys(u.active) as Array<keyof Usage["active"]>).map((k) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="capitalize text-muted">{k}</dt>
            <dd className="font-semibold">{u.active[k]}</dd>
          </div>
        ))}
      </dl>
      {anyGoogle || Object.values(u.usage).some((n) => n > 0) ? (
        <>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Google usage this month ({u.month})</p>
          <ul className="mt-1 flex flex-col gap-1">
            {(Object.keys(u.usage) as Array<keyof Usage["usage"]>).map((k) => {
              const cap = u.caps[k];
              const n = u.usage[k];
              const pct = cap > 0 ? Math.min(100, Math.round((n / cap) * 100)) : 0;
              return (
                <li key={k} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span>{LABEL[k]}</span>
                    <span className="font-semibold">
                      {n.toLocaleString()}{cap > 0 ? ` / ${cap.toLocaleString()}` : ""} {u.capped[k] && <Badge tone="paid">cap reached, using free providers</Badge>}
                    </span>
                  </div>
                  {cap > 0 && (
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-blue/15">
                      <div className={`h-full rounded ${pct >= 90 ? "bg-orange" : "bg-blue"}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">Caps keep you inside Google&apos;s free monthly allowance; when one is reached the app switches to OpenStreetMap until next month. Edit caps under Integrations.</p>
        </>
      ) : (
        <p className="mt-2 text-xs text-muted">Running entirely on free, open data. Add a Google key under Integrations to use Google Maps and Places with monthly caps.</p>
      )}
    </section>
  );
}
