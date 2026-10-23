"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_GROUPS } from "@/lib/categories";
import type { Category, CategoryId, DataSource } from "@/lib/types";

export function RadiusSlider({
  value,
  onChange,
  min = 1,
  max = 50,
  step = 1,
  label = "Search within",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
        <span className="text-sm font-bold text-navy dark:text-sky">
          {value} {value === 1 ? "mile" : "miles"}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        aria-label={label}
      />
    </div>
  );
}

export function CategoryChips({
  value,
  onChange,
  only,
}: {
  value: CategoryId[];
  onChange: (v: CategoryId[]) => void;
  only?: CategoryId[];
}) {
  const list = only ? CATEGORIES.filter((c) => only.includes(c.id)) : CATEGORIES;
  const toggle = (id: CategoryId) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const chip = (c: (typeof CATEGORIES)[number]) => {
    const on = value.includes(c.id);
    return (
      <button
        key={c.id}
        type="button"
        aria-pressed={on}
        title={c.hint ?? c.label}
        onClick={() => toggle(c.id)}
        className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition ${
          on ? "border-blue bg-blue text-white" : "border-border bg-surface text-foreground hover:border-blue"
        }`}
      >
        <span aria-hidden className="mr-1">
          {c.emoji}
        </span>
        {c.label}
      </button>
    );
  };
  // A short list (e.g. walkable categories) stays flat; the full catalogue is grouped.
  if (only) {
    return (
      <div className="hide-scrollbar flex gap-2 overflow-x-auto py-1 md:flex-wrap" role="group" aria-label="Categories">
        {list.map(chip)}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Categories">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{value.length} of {list.length} selected</span>
        <span className="flex gap-2">
          <button type="button" className="font-semibold text-blue hover:underline" onClick={() => onChange(list.map((c) => c.id))}>All</button>
          <button type="button" className="font-semibold text-blue hover:underline" onClick={() => onChange([])}>None</button>
        </span>
      </div>
      {CATEGORY_GROUPS.map((g) => {
        const members = list.filter((c) => c.group === g.id);
        if (members.length === 0) return null;
        const selected = members.filter((c) => value.includes(c.id)).length;
        return <CategoryGroup key={g.id} group={g} members={members} selected={selected} chip={chip} onAll={() => onChange(Array.from(new Set([...value, ...members.map((c) => c.id)])))} onNone={() => onChange(value.filter((v) => !members.some((c) => c.id === v)))} />;
      })}
    </div>
  );
}

function CategoryGroup({ group, members, selected, chip, onAll, onNone }: { group: { id: string; label: string; emoji: string }; members: Category[]; selected: number; chip: (c: Category) => React.ReactNode; onAll: () => void; onNone: () => void }) {
  const [open, setOpen] = useState(selected > 0);
  return (
    <div className="rounded-xl border border-border bg-background/60">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold">
          <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>▸</span>
          <span aria-hidden>{group.emoji}</span>
          <span className="truncate">{group.label}</span>
          <span className={`rounded-full px-1.5 text-[11px] ${selected ? "bg-blue text-white" : "bg-border text-muted"}`}>{selected}/{members.length}</span>
        </button>
        <button type="button" className="text-[11px] font-semibold text-blue hover:underline" onClick={onAll}>all</button>
        <button type="button" className="text-[11px] font-semibold text-muted hover:underline" onClick={onNone}>none</button>
      </div>
      {open && <div className="hide-scrollbar flex gap-2 overflow-x-auto px-2 pb-2 md:flex-wrap">{members.map(chip)}</div>}
    </div>
  );
}

export function SourceBanner({ source, notice }: { source?: DataSource; notice?: string }) {
  if (source !== "demo") return null;
  return (
    <div className="rounded-lg border border-orange/50 bg-cream px-3 py-2 text-xs text-foreground">
      <strong>Sample data.</strong> {notice ?? "Live data sources were unavailable."} Listings here are
      illustrative and not verified.
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50";
  const styles = {
    primary: "bg-gradient-to-r from-coral to-orange text-white shadow hover:brightness-105",
    secondary: "border border-border bg-surface text-foreground hover:bg-cream",
    ghost: "text-blue hover:bg-cream",
  }[variant];
  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1 text-sm font-medium ${
            value === o.value ? "bg-navy text-white" : "text-muted hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">{children}</p>;
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-coral/50 bg-coral/10 px-3 py-2 text-sm">{children}</p>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "free" | "paid" | "neutral" | "tesla" | "blue" }) {
  const styles = {
    free: "bg-green/15 text-green border-green/40",
    paid: "bg-orange/15 text-orange border-orange/40",
    neutral: "bg-border/60 text-muted border-border",
    tesla: "bg-coral/15 text-coral border-coral/40",
    blue: "bg-blue/15 text-blue border-blue/40",
  }[tone];
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles}`}>{children}</span>;
}

/** Password field with a show/hide eye. Pass any <input> props except `type`. */
export function PasswordInput({ className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <input {...props} type={show ? "text" : "password"} className={`${className ?? ""} pr-11`} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        title={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-cream hover:text-foreground"
      >
        {show ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}
