"use client";

import { useId, useRef, useState } from "react";
import { geocodeClient } from "@/lib/client";
import type { GeoResult } from "@/lib/types";

type Props = {
  label: string;
  placeholder?: string;
  value: GeoResult | undefined;
  onChange: (v: GeoResult | undefined) => void;
  onLocate?: () => Promise<GeoResult | null>;
  locating?: boolean;
};

export function PlaceInput({ label, placeholder, value, onChange, onLocate, locating }: Props) {
  const id = useId();
  const [text, setText] = useState(value?.label ?? "");
  const [hits, setHits] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  // Keep the text in sync when the value is set from outside (e.g. "use my location").
  const [prevLabel, setPrevLabel] = useState(value?.label);
  if (value?.label !== prevLabel) {
    setPrevLabel(value?.label);
    setText(value?.label ?? "");
  }

  function query(q: string) {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const mine = ++seq.current;
      setBusy(true);
      try {
        const r = await geocodeClient(q.trim());
        if (mine === seq.current) {
          setHits(r.data);
          setOpen(true);
        }
      } catch {
        if (mine === seq.current) setHits([]);
      } finally {
        if (mine === seq.current) setBusy(false);
      }
    }, 300);
  }

  function pick(h: GeoResult) {
    onChange(h);
    setText(h.label);
    setOpen(false);
  }

  async function onBlur() {
    // give click handlers a chance to run
    setTimeout(() => setOpen(false), 150);
    if (!value && text.trim().length >= 2 && hits[0]) pick(hits[0]);
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            if (value) onChange(undefined);
            query(e.target.value);
          }}
          onFocus={() => hits.length && setOpen(true)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits[0]) {
              e.preventDefault();
              pick(hits[0]);
            }
          }}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none ring-blue/40 focus:ring-2"
        />
        {onLocate && (
          <button
            type="button"
            title="Use my location"
            aria-label="Use my location"
            disabled={locating}
            onClick={async () => {
              const r = await onLocate();
              if (r) pick(r);
            }}
            className="shrink-0 rounded-lg border border-border bg-surface px-3 text-lg hover:bg-cream disabled:opacity-50"
          >
            {locating ? "…" : "📡"}
          </button>
        )}
      </div>
      {open && hits.length > 0 && (
        <ul className="absolute z-[1200] mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {hits.map((h, i) => (
            <li key={`${h.lat},${h.lng},${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(h)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-cream"
              >
                {h.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {busy && <span className="absolute right-14 top-7 text-xs text-muted">searching…</span>}
    </div>
  );
}
