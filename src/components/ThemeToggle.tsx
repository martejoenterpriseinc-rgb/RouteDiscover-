"use client";

import { useSyncExternalStore } from "react";
import { getThemePref, setThemePref, subscribeTheme, type ThemePref } from "@/lib/theme";

const AutoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true" className="inline-block">
    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M10 2a8 8 0 0 1 0 16z" fill="currentColor" />
  </svg>
);

const OPTIONS: Array<{ value: ThemePref; icon: React.ReactNode; label: string; help: string }> = [
  { value: "light", icon: "☀️", label: "Day", help: "Always light" },
  { value: "dark", icon: "🌙", label: "Night", help: "Always dark" },
  { value: "auto", icon: <AutoIcon />, label: "Auto", help: "Follow the device setting" },
];

/** Day / Night / Auto switch. `compact` shows icons only (for headers); otherwise icons with labels. */
export function ThemeToggle({ compact = false, onDark = false, className = "" }: { compact?: boolean; onDark?: boolean; className?: string }) {
  const pref = useSyncExternalStore(subscribeTheme, getThemePref, () => "auto" as ThemePref);
  const frame = onDark ? "border-white/30 bg-white/10" : "border-border bg-surface";
  const on = onDark ? "bg-white text-navy" : "bg-navy text-white";
  const off = onDark ? "text-white/80 hover:bg-white/10" : "text-muted hover:bg-cream hover:text-foreground";
  return (
    <div role="radiogroup" aria-label="Appearance" className={`inline-flex shrink-0 items-center rounded-full border p-0.5 ${frame} ${className}`}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={pref === o.value}
          aria-label={`${o.label} mode`}
          title={`${o.label}: ${o.help}`}
          onClick={() => setThemePref(o.value)}
          className={`flex items-center gap-1 rounded-full text-xs font-semibold leading-none transition ${compact ? "h-6 w-6 justify-center sm:h-7 sm:w-7" : "px-3 py-1.5"} ${pref === o.value ? on : off}`}
        >
          <span aria-hidden="true">{o.icon}</span>
          {!compact && o.label}
        </button>
      ))}
    </div>
  );
}
