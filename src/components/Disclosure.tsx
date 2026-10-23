"use client";

import { useSyncExternalStore } from "react";

/* Open/closed state per panel id, remembered on this device. */
const KEY = (id: string) => `rd_panel_${id}`;
const listeners = new Map<string, Set<() => void>>();
function read(id: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(KEY(id));
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}
function write(id: string, open: boolean) {
  try {
    localStorage.setItem(KEY(id), open ? "1" : "0");
  } catch {
    /* ignore */
  }
  listeners.get(id)?.forEach((l) => l());
}
function subscribe(id: string, cb: () => void) {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id)!.add(cb);
  return () => listeners.get(id)?.delete(cb);
}

export function usePanelOpen(id: string, defaultOpen = true): [boolean, (open: boolean) => void] {
  const open = useSyncExternalStore(
    (cb) => subscribe(id, cb),
    () => read(id, defaultOpen),
    () => defaultOpen,
  );
  return [open, (v) => write(id, v)];
}

export function Chevron({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true" className={`shrink-0 transition-transform ${open ? "rotate-90" : ""} ${className}`}>
      <path d="M7 5l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A panel whose body can be hidden with one tap. The title row is the toggle; `aside` sits on
 * the right and stays usable while the panel is collapsed. The state is remembered per `id`.
 */
export function Disclosure({
  id,
  title,
  subtitle,
  aside,
  summary,
  defaultOpen = true,
  children,
  className = "",
  bodyClassName = "",
  headingLevel = 2,
  size = "md",
}: {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  aside?: React.ReactNode;
  /** Shown in the title row only while collapsed (e.g. "12 results"). */
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headingLevel?: 1 | 2 | 3;
  size?: "sm" | "md" | "lg";
}) {
  const [open, setOpen] = usePanelOpen(id, defaultOpen);
  const H = (`h${headingLevel}`) as "h1" | "h2" | "h3";
  const titleClass = size === "lg" ? "text-lg font-bold" : size === "sm" ? "text-xs font-semibold uppercase tracking-wide text-muted" : "font-semibold";
  return (
    <section className={className} data-panel={id} data-open={open ? "1" : "0"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={`panel-${id}`}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
          title={open ? "Hide" : "Show"}
        >
          <Chevron open={open} className="mt-1 text-muted" />
          <span className="min-w-0 flex-1">
            <H className={titleClass}>{title}</H>
            {open && subtitle && <span className="block text-sm text-muted">{subtitle}</span>}
            {!open && summary && <span className="block text-xs text-muted">{summary}</span>}
          </span>
          <span className="ml-1 shrink-0 text-xs font-semibold text-muted">{open ? "Hide" : "Show"}</span>
        </button>
        {aside && <div className="shrink-0" onClick={(e) => e.stopPropagation()}>{aside}</div>}
      </div>
      <div id={`panel-${id}`} hidden={!open} className={open ? bodyClassName : ""}>
        {open && children}
      </div>
    </section>
  );
}
