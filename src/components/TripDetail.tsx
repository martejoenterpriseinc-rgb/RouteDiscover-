"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlaceCard } from "./Cards";
import { SendToPhone } from "./SendToPhone";
import { ShareButtons } from "./ShareButtons";
import { TripMap } from "./TripMap";
import { Badge, Button, Empty, ErrorNote } from "./ui";
import { useTrip } from "@/hooks/useTrip";
import { fmtDuration, fmtMiles } from "@/lib/geo";
import { deleteTrip, fmtDate, isHistory, removeStop, shareTrip, updateTrip, type TripRecord } from "@/lib/trips-client";

const field = "rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none ring-blue/40 focus:ring-2";

export function TripDetail({ initial, origin }: { initial: TripRecord; origin: string }) {
  const router = useRouter();
  const { update } = useTrip();
  const [trip, setTrip] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: initial.name, startDate: initial.startDate, endDate: initial.endDate, notes: initial.notes });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const shareUrl = `${origin}/t/${trip.shareToken}`;
  const past = isHistory(trip);

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function planStops() {
    update({
      origin: trip.origin,
      destination: trip.destination,
      radiusMiles: trip.radiusMiles,
      radiusTouched: true,
      route: trip.routeGeometry
        ? { source: "live", geometry: trip.routeGeometry, distanceMiles: trip.distanceMiles ?? 0, durationMinutes: trip.durationMinutes ?? 0, origin: trip.origin, destination: trip.destination }
        : undefined,
      activeTrip: { id: trip.id, name: trip.name },
    });
    router.push("/app");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:h-[calc(100vh-57px)] md:flex-row">
      <section className="flex min-h-0 flex-col gap-3 p-4 md:w-[460px] md:shrink-0 md:overflow-y-auto">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          {editing ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const t = await run(() => updateTrip(trip.id, form));
                if (t) {
                  setTrip(t);
                  setEditing(false);
                }
              }}
            >
              <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <div className="flex gap-2">
                <input type="date" className={field} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                <input type="date" className={field} value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
              </div>
              <textarea className={field} rows={3} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>Save</Button>
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl font-extrabold tracking-tight">{trip.name}</h1>
                <Button variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
              </div>
              <p className="text-sm text-muted">
                {trip.origin.label} → {trip.destination.label}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {fmtDate(trip.startDate)}
                {trip.endDate !== trip.startDate ? ` – ${fmtDate(trip.endDate)}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {trip.status === "completed" ? <Badge tone="free">Completed</Badge> : trip.status === "canceled" ? <Badge>Canceled</Badge> : past ? <Badge>Past</Badge> : <Badge tone="blue">Planned</Badge>}
                {trip.distanceMiles ? <Badge>{fmtMiles(trip.distanceMiles)}</Badge> : null}
                {trip.durationMinutes ? <Badge>{fmtDuration(trip.durationMinutes)} driving</Badge> : null}
                <Badge>±{trip.radiusMiles} mi corridor</Badge>
              </div>
              {trip.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{trip.notes}</p>}
            </>
          )}
          {error && <div className="mt-2"><ErrorNote>{error}</ErrorNote></div>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={planStops}>🧭 Find stops along this route</Button>
            <SendToPhone path={trip.isPublic ? `/t/${trip.shareToken}` : `/app/trips/${trip.id}`} title={trip.name} />
            {trip.status !== "completed" ? (
              <Button variant="secondary" disabled={busy} onClick={async () => { const t = await run(() => updateTrip(trip.id, { status: "completed" })); if (t) setTrip(t); }}>
                ✓ Mark completed
              </Button>
            ) : (
              <Button variant="secondary" disabled={busy} onClick={async () => { const t = await run(() => updateTrip(trip.id, { status: "planned" })); if (t) setTrip(t); }}>
                Reopen trip
              </Button>
            )}
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                if (!confirm("Delete this trip? This can't be undone.")) return;
                const ok = await run(() => deleteTrip(trip.id));
                if (ok) router.push("/app/trips");
              }}
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Share this trip</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={trip.isPublic}
                onChange={async (e) => {
                  const r = await run(() => shareTrip(trip.id, e.target.checked ? "enable" : "disable"));
                  if (r) setTrip({ ...trip, isPublic: r.isPublic });
                }}
              />
              Public link
            </label>
          </div>
          {trip.isPublic ? (
            <div className="mt-3">
              <ShareButtons
                url={shareUrl}
                title={`${trip.name} on RouteDiscover`}
                text={`Here's my trip plan: ${trip.origin.label} → ${trip.destination.label}, ${fmtDate(trip.startDate)}.`}
                onShared={(channel) => void shareTrip(trip.id, "enable", channel)}
              />
              <button type="button" className="mt-2 text-xs text-muted hover:underline" onClick={async () => { const r = await run(() => shareTrip(trip.id, "rotate")); if (r) setTrip({ ...trip, shareToken: r.url.split("/t/")[1] }); }}>
                Reset link (old link stops working)
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Turn on the public link to send this trip to anyone, or post it to social media.</p>
          )}
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setInviteMsg(null);
              const res = await fetch("/api/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail, tripId: trip.id }) });
              const j = (await res.json()) as { error?: string; sent?: boolean; mailto?: string };
              if (!res.ok) return setInviteMsg(j.error ?? "Could not send.");
              if (j.sent) setInviteMsg(`Invitation emailed to ${inviteEmail}.`);
              else if (j.mailto) {
                window.location.href = j.mailto;
                setInviteMsg("Opening your email app with the invitation.");
              }
              setInviteEmail("");
            }}
          >
            <input className={`${field} min-w-0 flex-1`} type="email" placeholder="Invite a friend by email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
            <Button type="submit" variant="secondary">Invite</Button>
          </form>
          {inviteMsg && <p className="mt-1 text-xs text-muted">{inviteMsg}</p>}
        </div>

        <div>
          <h2 className="mb-2 font-bold">
            Stops <span className="text-sm font-normal text-muted">({trip.stops.length})</span>
          </h2>
          {trip.stops.length === 0 ? (
            <Empty>No stops yet. Use “Find stops along this route” and tap “Add to trip” on anything you like.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {trip.stops.map((s) => (
                <PlaceCard
                  key={s.id}
                  place={s}
                  selected={selected === s.id}
                  onClick={() => setSelected(s.id)}
                  action={
                    <button
                      type="button"
                      className="text-xs font-semibold text-coral hover:underline"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const t = await run(() => removeStop(trip.id, s.id));
                        if (t) setTrip(t);
                      }}
                    >
                      Remove
                    </button>
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </section>
      <section className="relative min-h-0 flex-1 h-[50vh] md:h-auto">
        <TripMap route={trip.routeGeometry} stops={trip.stops} selectedId={selected} onSelect={setSelected} />
      </section>
    </div>
  );
}
