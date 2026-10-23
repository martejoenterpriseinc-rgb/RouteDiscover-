"use client";

import { Disclosure } from "./Disclosure";
import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "@/lib/settings";
import { Badge, Button, ErrorNote } from "./ui";

export type ConsoleState = {
  draft: AppSettings;
  draftUpdatedAt: string | null;
  livePublishedAt: string | null;
  hasUnpublishedChanges: boolean;
  envFallbacks: { stripe: boolean; google: boolean; openChargeMap: boolean; email: boolean };
};

export const field = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none ring-blue/40 focus:ring-2";

export function useOwnerConsole() {
  const [state, setState] = useState<ConsoleState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"idle" | "saving" | "publishing">("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/owner/settings")
      .then(async (res) => {
        const j = (await res.json()) as ConsoleState & { error?: string };
        if (!res.ok) throw new Error(j.error || "Could not load settings.");
        if (!cancelled) setState(j);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load settings.");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function save(patch: Record<string, unknown>) {
    setBusy("saving");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/owner/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const j = (await res.json()) as ConsoleState & { error?: string };
      if (!res.ok) throw new Error(j.error || "Save failed.");
      setState(j);
      setNotice("Saved to draft. Press “Go live” to publish.");
      return j;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      return null;
    } finally {
      setBusy("idle");
    }
  }

  async function publish() {
    setBusy("publishing");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/owner/publish", { method: "POST" });
      const j = (await res.json()) as { error?: string; warnings: string[]; stripe: { priceId: string; created: boolean } | null; console: ConsoleState };
      if (!res.ok) throw new Error(j.error || "Publish failed.");
      setState(j.console);
      setWarnings(j.warnings);
      setNotice(j.stripe ? `Live. Stripe price ${j.stripe.created ? "created" : "verified"} (${j.stripe.priceId}).` : "Live.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setBusy("idle");
    }
  }

  return { state, setState, error, busy, notice, warnings, save, publish, reload };
}

export function PublishBar({ c, onSave, saveLabel = "Update and save" }: { c: ReturnType<typeof useOwnerConsole>; onSave: () => void; saveLabel?: string }) {
  const s = c.state;
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:rounded-2xl md:border md:mx-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm">
          {s?.hasUnpublishedChanges ? <Badge tone="paid">Unpublished changes</Badge> : <Badge tone="free">Live matches draft</Badge>}
          <span className="ml-2 text-xs text-muted">
            {s?.livePublishedAt ? `Last went live ${new Date(s.livePublishedAt).toLocaleString()}` : "Never published: the app is running on defaults"}
          </span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={onSave} disabled={c.busy !== "idle"}>
            {c.busy === "saving" ? "Saving…" : saveLabel}
          </Button>
          <Button onClick={c.publish} disabled={c.busy !== "idle"}>
            {c.busy === "publishing" ? "Publishing…" : "🚀 Go live"}
          </Button>
        </div>
      </div>
      {c.notice && <p className="mt-2 text-sm text-green">{c.notice}</p>}
      {c.error && <div className="mt-2"><ErrorNote>{c.error}</ErrorNote></div>}
      {c.warnings.map((w) => (
        <p key={w} className="mt-1 text-sm text-orange">⚠ {w}</p>
      ))}
    </div>
  );
}

export function Section({ title, subtitle, children, aside }: { title: string; subtitle?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  const id = `owner-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  return (
    <Disclosure id={id} title={title} subtitle={subtitle} aside={aside} size="lg" className="rounded-2xl border border-border bg-surface p-5 shadow-sm" bodyClassName="mt-4 grid gap-3 sm:grid-cols-2">
      {children}
    </Disclosure>
  );
}

export function Field({ label, value, onChange, type = "text", placeholder, hint, wide, secret }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; hint?: string; wide?: boolean; secret?: boolean }) {
  const [reveal, setReveal] = useState(false);
  return (
    <label className={`text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex gap-1">
        <input className={field} type={secret && !reveal ? "password" : type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} autoComplete="off" />
        {secret && (
          <button type="button" className="shrink-0 rounded-lg border border-border px-2 text-xs text-muted" onClick={() => setReveal((r) => !r)}>
            {reveal ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TestButton({ target, id, label = "Test connection" }: { target: string; id?: string; label?: string }) {
  const [state, setState] = useState<{ ok: boolean; message: string; ms: number } | "busy" | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="secondary"
        className="px-3 py-1 text-xs"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          try {
            const res = await fetch("/api/owner/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target, id }) });
            setState((await res.json()) as { ok: boolean; message: string; ms: number });
          } catch {
            setState({ ok: false, message: "Request failed", ms: 0 });
          }
        }}
      >
        {state === "busy" ? "Testing…" : label}
      </Button>
      {state && state !== "busy" && (
        <span className={`max-w-xs text-right text-xs ${state.ok ? "text-green" : "text-coral"}`}>
          {state.ok ? "✔" : "✖"} {state.message} <span className="text-muted">({state.ms} ms)</span>
        </span>
      )}
    </div>
  );
}
