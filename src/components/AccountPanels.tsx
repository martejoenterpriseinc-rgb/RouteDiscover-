"use client";

import { Disclosure } from "./Disclosure";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Preferences } from "@/db/schema";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryId, GeoResult } from "@/lib/types";
import { PlaceInput } from "./PlaceInput";
import { ShareButtons } from "./ShareButtons";
import { Button, CategoryChips, ErrorNote, PasswordInput, RadiusSlider, Segmented } from "./ui";

const field = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none ring-blue/40 focus:ring-2";

export function Card({ title, children, subtitle }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const id = `account-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  return (
    <Disclosure id={id} title={title} subtitle={subtitle} size="lg" className="rounded-2xl border border-border bg-surface p-5 shadow-sm" bodyClassName="mt-4 flex flex-col gap-4">
      {children}
    </Disclosure>
  );
}

export function ProfileForm({ name, email, memberSince }: { name: string; email: string; memberSince: string }) {
  const [value, setValue] = useState(name);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const router = useRouter();
  return (
    <Card title="Profile">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setState("saving");
          await fetch("/api/me/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: value }) });
          setState("saved");
          router.refresh();
          setTimeout(() => setState("idle"), 1500);
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Name</span>
          <input className={field} value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <div className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Email</span>
          <span>{email}</span>
        </div>
        <p className="text-xs text-muted">Member since {memberSince}</p>
        <div>
          <Button type="submit" variant="secondary" disabled={state === "saving"}>
            {state === "saved" ? "Saved ✓" : state === "saving" ? "Saving…" : "Save name"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function PreferencesForm({ initial }: { initial: Preferences }) {
  const [p, setP] = useState<Preferences>(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) => setP((cur) => ({ ...cur, [k]: v }));

  return (
    <Card title="Trip preferences" subtitle="Defaults for every new search. You can still change them on the fly.">
      <form
        className="flex flex-col gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setState("saving");
          setError(null);
          const res = await fetch("/api/me/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, home: p.home ?? null }) });
          if (!res.ok) {
            setError("Could not save preferences.");
            setState("idle");
            return;
          }
          setState("saved");
          setTimeout(() => setState("idle"), 1500);
        }}
      >
        <RadiusSlider label="Default miles off route" value={p.radiusMiles} min={1} max={50} onChange={(v) => set("radiusMiles", v)} />
        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Default categories</span>
          <CategoryChips value={p.categories} onChange={(v: CategoryId[]) => set("categories", v)} />
          <p className="mt-1 text-xs text-muted">{p.categories.length} of {CATEGORIES.length} selected</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Vehicle</span>
            <Segmented
              value={p.vehicle}
              onChange={(v) => set("vehicle", v)}
              options={[
                { value: "tesla", label: "Tesla" },
                { value: "other-ev", label: "Other EV" },
                { value: "gas", label: "Gas" },
              ]}
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Charging connector</span>
            <Segmented
              value={p.connector}
              onChange={(v) => set("connector", v)}
              options={[
                { value: "nacs", label: "NACS" },
                { value: "ccs", label: "CCS" },
                { value: "j1772", label: "J1772" },
                { value: "none", label: "None" },
              ]}
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Walk radius while charging</span>
            <Segmented
              value={String(p.walkRadius)}
              onChange={(v) => set("walkRadius", Number(v))}
              options={[
                { value: "0.25", label: "¼ mi" },
                { value: "0.5", label: "½ mi" },
                { value: "1", label: "1 mi" },
              ]}
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Units</span>
            <Segmented value={p.units} onChange={(v) => set("units", v)} options={[{ value: "mi", label: "Miles" }, { value: "km", label: "Kilometres" }]} />
          </div>
        </div>
        <PlaceInput label="Home (used as a quick starting point)" placeholder="City or address" value={p.home} onChange={(v: GeoResult | undefined) => set("home", v)} />
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Mobile number (for “send to phone” texts)</span>
          <input className={field} type="tel" placeholder="+1 217 555 0123" value={p.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={p.marketingOptIn} onChange={(e) => set("marketingOptIn", e.target.checked)} className="h-4 w-4" />
          Email me trip ideas and product updates
        </label>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div>
          <Button type="submit" disabled={state === "saving"}>
            {state === "saved" ? "Preferences saved ✓" : state === "saving" ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function InvitePanel({ referralCode, origin }: { referralCode: string; origin: string }) {
  const url = `${origin}/invite/${referralCode}`;
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Card title="Invite a friend" subtitle="Friends who join with your link are connected to your account.">
      <ShareButtons url={url} title="Join me on RouteDiscover" text="I'm using RouteDiscover to find great stops on road trips. Try it:" />
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          const res = await fetch("/api/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
          const j = (await res.json()) as { error?: string; sent?: boolean; mailto?: string };
          if (!res.ok) return setMsg(j.error ?? "Could not send.");
          if (j.sent) setMsg(`Invitation emailed to ${email}.`);
          else if (j.mailto) {
            window.location.href = j.mailto;
            setMsg("Opening your email app with the invitation.");
          }
          setEmail("");
        }}
      >
        <input className={field} type="email" placeholder="friend@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Button type="submit" variant="secondary">Send invite</Button>
      </form>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </Card>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}

export function DeleteAccountPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card title="Delete account" subtitle="Removes your profile, trips, preferences and subscription records. Claimed businesses return to unclaimed. This can't be undone.">
      {!open ? (
        <div><Button variant="secondary" onClick={() => setOpen(true)}>Delete my account…</Button></div>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            const res = await fetch("/api/me/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
            const j = (await res.json()) as { error?: string };
            setBusy(false);
            if (!res.ok) return setError(j.error ?? "Could not delete.");
            router.push("/");
            router.refresh();
          }}
        >
          <PasswordInput className={field} placeholder="Confirm your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy} className="bg-gradient-to-r from-coral to-coral">{busy ? "Deleting…" : "Permanently delete"}</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
