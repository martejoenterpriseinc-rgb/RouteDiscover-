"use client";

import { useId, useState } from "react";
import type { DailyPoint } from "@/lib/stats";

/* Chart furniture: series ink is blue/orange (validated for CVD), text uses text tokens. */
const SERIES = ["var(--blue)", "var(--orange)"];

export function StatTile({ label, value, sub, trend, accent }: { label: string; value: string | number; sub?: string; trend?: DailyPoint[]; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-orange/60 bg-cream" : "border-border bg-surface"}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="text-3xl font-extrabold tracking-tight">{typeof value === "number" ? compact(value) : value}</div>
        {trend && trend.length > 1 && <Sparkline points={trend} />}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function Sparkline({ points }: { points: DailyPoint[] }) {
  const w = 96;
  const h = 28;
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = w / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - 2 - (p.value / max) * (h - 4)).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      <path d={d} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={w} cy={h - 2 - (last.value / max) * (h - 4)} r={3} fill="var(--orange)" />
    </svg>
  );
}

type Series = { name: string; points: DailyPoint[] };

/** Multi-series line chart (max 2 series) with hover tooltip, legend and table view. */
export function LineChart({ title, series, height = 220 }: { title: string; series: Series[]; height?: number }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const w = 720;
  const h = height;
  const pad = { l: 36, r: 12, t: 12, b: 28 };
  const n = series[0]?.points.length ?? 0;
  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.value)));
  const niceMax = niceCeil(max);
  const x = (i: number) => pad.l + (i / Math.max(1, n - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / niceMax) * (h - pad.t - pad.b);
  const ticks = [0, 0.5, 1].map((f) => f * niceMax);
  const days = series[0]?.points ?? [];

  return (
    <figure className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <figcaption className="font-semibold">{title}</figcaption>
        <div className="flex items-center gap-3 text-xs">
          {series.map((s, i) => (
            <span key={s.name} className="flex items-center gap-1 text-muted">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: SERIES[i] }} aria-hidden />
              {s.name}
            </span>
          ))}
          <button type="button" className="rounded border border-border px-2 py-0.5 text-muted hover:text-foreground" onClick={() => setTable((t) => !t)} aria-pressed={table}>
            {table ? "Chart" : "Table"}
          </button>
        </div>
      </div>
      {table ? (
        <div className="mt-2 max-h-56 overflow-auto text-xs">
          <table className="w-full">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-1">Day</th>
                {series.map((s) => (
                  <th key={s.name} className="py-1 text-right">{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d.day} className="border-t border-border">
                  <td className="py-1">{d.day}</td>
                  {series.map((s) => (
                    <td key={s.name} className="py-1 text-right">{s.points[i]?.value ?? 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-2">
          <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-labelledby={`${id}-t`} onMouseLeave={() => setHover(null)}>
            <title id={`${id}-t`}>{title}</title>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
                <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">{compact(t)}</text>
              </g>
            ))}
            {days.map((d, i) => (i % Math.ceil(n / 6) === 0 || i === n - 1) && (
              <text key={d.day} x={x(i)} y={h - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">{d.day.slice(5)}</text>
            ))}
            {series.map((s, si) => (
              <path key={s.name} d={s.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")} fill="none" stroke={SERIES[si]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {hover != null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={h - pad.b} stroke="var(--muted)" strokeDasharray="3 3" />
                {series.map((s, si) => (
                  <circle key={s.name} cx={x(hover)} cy={y(s.points[hover]?.value ?? 0)} r={4} fill={SERIES[si]} stroke="var(--surface)" strokeWidth={2} />
                ))}
              </g>
            )}
            {days.map((_, i) => (
              <rect key={i} x={x(i) - (w - pad.l - pad.r) / Math.max(1, n - 1) / 2} y={pad.t} width={(w - pad.l - pad.r) / Math.max(1, n - 1)} height={h - pad.t - pad.b} fill="transparent" onMouseEnter={() => setHover(i)} />
            ))}
          </svg>
          {hover != null && (
            <div className="pointer-events-none absolute top-2 rounded-lg border border-border bg-surface px-2 py-1 text-xs shadow" style={{ left: `${(x(hover) / w) * 100}%`, transform: hover > n / 2 ? "translateX(-110%)" : "translateX(10%)" }}>
              <div className="font-semibold">{days[hover]?.day}</div>
              {series.map((s) => (
                <div key={s.name} className="text-muted">
                  {s.name}: <span className="text-foreground">{s.points[hover]?.value ?? 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

function niceCeil(v: number) {
  if (v <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * p;
}

/** Horizontal bars, single series. */
export function BarList({ title, rows }: { title: string; rows: Array<{ label: string; value: number; note?: string }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <figure className="rounded-2xl border border-border bg-surface p-4">
      <figcaption className="font-semibold">{title}</figcaption>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.label} className="text-sm">
            <div className="flex items-center justify-between">
              <span>{r.label}</span>
              <span className="font-semibold">{compact(r.value)}{r.note ? <span className="ml-1 text-xs font-normal text-muted">{r.note}</span> : null}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded bg-blue/15">
              <div className="h-full rounded bg-blue" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
