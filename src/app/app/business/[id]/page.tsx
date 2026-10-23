"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LineChart, StatTile } from "@/components/Charts";
import { SubmissionRow } from "@/components/SubmissionRow";
import { Badge, Button, Empty, ErrorNote, Segmented } from "@/components/ui";
import { businessQueue, businessTraffic, moderateSubmission, syncBusiness, updateBusiness, type QueueItem, type Traffic } from "@/lib/business-client";
import type { PresentedBusiness } from "@/lib/business";
import { claimBusiness, getListing, money } from "@/lib/listing-client";
import type { ListingView } from "@/lib/listing-view";

const field = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none ring-blue/40 focus:ring-2";
type Tab = "overview" | "edit" | "queue";
const EDIT_FIELDS = [
  { key: "name", label: "Business name", rows: 1 },
  { key: "address", label: "Address", rows: 1 },
  { key: "phone", label: "Phone", rows: 1 },
  { key: "website", label: "Website", rows: 1 },
  { key: "hours", label: "Hours", rows: 1, hint: "e.g. Mo-Fr 09:00-17:00; Sa 10:00-14:00" },
  { key: "description", label: "About", rows: 3 },
  { key: "specials", label: "Specials", rows: 3 },
  { key: "menu", label: "Menu", rows: 8 },
] as const;
type EditKey = (typeof EDIT_FIELDS)[number]["key"];

function Inner() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>("overview");
  const [view, setView] = useState<ListingView | null>(null);
  const [traffic, setTraffic] = useState<Traffic | null>(null);
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [held, setHeld] = useState(0);
  const [form, setForm] = useState<Record<EditKey, string>>({ name: "", address: "", phone: "", website: "", hours: "", description: "", specials: "", menu: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(params.get("notice") || (params.get("checkout") === "success" ? "Payment received. Your listing is now yours to manage." : null));
  const [busy, setBusy] = useState(false);

  function seed(b: PresentedBusiness) {
    setForm({ name: b.name, address: b.address ?? "", phone: b.phone ?? "", website: b.website ?? "", hours: b.hours ?? "", description: b.description ?? "", specials: b.specials ?? "", menu: b.menu ?? "" });
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([getListing(id), businessTraffic(id), businessQueue(id)])
      .then(([v, t, q]) => {
        if (cancelled) return;
        setView(v);
        seed(v.business);
        setTraffic(t);
        setQueue(q.queue);
        setHeld(q.heldForAudit);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load."));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <div className="p-4"><ErrorNote>{error}</ErrorNote></div>;
  if (!view || !traffic) return <p className="p-4 text-sm text-muted">Loading…</p>;
  if (!view.canManage) return <div className="p-4"><ErrorNote>You don&apos;t manage this business.</ErrorNote></div>;
  const b = view.business;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href="/app/business" className="text-sm text-blue hover:underline">← My businesses</Link>
          <h1 className="text-2xl font-extrabold tracking-tight">{b.name}</h1>
          <p className="text-sm text-muted">{b.address}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {view.plan.sponsor ? <Badge tone="paid">★ Sponsored until {new Date(view.plan.sponsorUntil!).toLocaleDateString()}</Badge> : view.plan.basic ? <Badge tone="blue">Basic monitoring</Badge> : <Badge>No active plan</Badge>}
            <Badge tone="free">✓ Verified</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/place/${id}`} className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-cream">View public listing</Link>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await syncBusiness(id);
                setView({ ...view, business: r.business });
                setNotice(r.changed.length ? `Synced from ${r.source === "demo" ? "sample data" : "online sources"}: ${r.changed.join(", ")} changed. Your own edits are kept.` : "Synced. Nothing changed online.");
              })
            }
          >
            🔄 Sync from online
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await claimBusiness(id, "sponsor");
                if (r.url) window.location.href = r.url;
                else {
                  setView(await getListing(id));
                  setNotice(r.notice ?? "Sponsorship extended.");
                }
              })
            }
          >
            ★ {view.plan.sponsor ? "Extend sponsorship" : "Sponsor top placement"} · {money(view.pricing.sponsorPriceCents, view.pricing.currency)}
          </Button>
        </div>
      </div>
      {notice && <p className="rounded-lg border border-green/40 bg-green/10 px-3 py-2 text-sm">{notice}</p>}
      <Segmented value={tab} onChange={setTab} options={[{ value: "overview", label: "Traffic" }, { value: "edit", label: "Edit listing" }, { value: "queue", label: `Customer updates (${queue?.length ?? 0})` }]} />

      {tab === "overview" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Listing views" value={traffic.views} sub={`last ${traffic.days} days`} trend={traffic.series} accent />
            <StatTile label="Seen in search results" value={traffic.impressions} sub="sponsored and verified listings" />
            <StatTile label="Website / map / call clicks" value={(traffic.clicks.website ?? 0) + (traffic.clicks.maps ?? 0) + (traffic.clicks.call ?? 0)} sub={`${traffic.clicks.website ?? 0} web · ${traffic.clicks.maps ?? 0} maps · ${traffic.clicks.call ?? 0} calls`} />
            <StatTile label="Added to trips" value={traffic.tripAdds} sub={`${traffic.submissions.approved} customer updates live · ${traffic.submissions.pending} pending`} />
          </div>
          <LineChart title={`Listing views (last ${traffic.days} days)`} series={[{ name: "Views", points: traffic.series }]} />
          <p className="text-xs text-muted">Sponsored listings appear first in every search that includes them. Views are counted when a traveler opens your listing.</p>
        </>
      )}

      {tab === "edit" && (
        <form
          className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const patch: Record<string, string | null> = {};
              for (const f of EDIT_FIELDS) patch[f.key] = form[f.key] || null;
              const updated = await updateBusiness(id, patch);
              setView({ ...view, business: updated });
              seed(updated);
              setNotice("Listing updated. Travelers see your changes immediately.");
            });
          }}
        >
          <p className="text-xs text-muted">Fields marked “synced” come from online sources; typing a value overrides them, and “Use synced value” puts them back.</p>
          {EDIT_FIELDS.map((f) => (
            <label key={f.key} className="text-sm">
              <span className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
                {f.label}
                {f.key in b.overrides && (
                  b.overrides[f.key] ? (
                    <button type="button" className="font-normal normal-case text-blue hover:underline" onClick={() => run(async () => { const u = await updateBusiness(id, { [f.key]: null }); setView({ ...view, business: u }); seed(u); })}>
                      Use synced value
                    </button>
                  ) : (
                    <span className="font-normal normal-case">synced</span>
                  )
                )}
              </span>
              {f.rows > 1 ? (
                <textarea className={field} rows={f.rows} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              ) : (
                <input className={field} value={form[f.key]} placeholder={"hint" in f ? f.hint : undefined} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </label>
          ))}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save listing"}</Button>
            <Link href={`/app/place/${id}`} className="text-sm text-blue hover:underline">Add photos on the public listing →</Link>
          </div>
        </form>
      )}

      {tab === "queue" && (
        <>
          {held > 0 && <p className="rounded-lg border border-coral/50 bg-coral/10 px-3 py-2 text-sm">{held} update{held === 1 ? "" : "s"} on your listing {held === 1 ? "is" : "are"} held for a RouteDiscover audit and will appear here if cleared.</p>}
          {queue && queue.length === 0 ? (
            <Empty>No pending customer updates. Approved reviews, photos, menus and specials appear on your listing; approved hours and corrections replace your current values.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {queue?.map((item) => (
                <SubmissionRow
                  key={item.id}
                  item={item}
                  busy={busy}
                  onDecide={(decision) =>
                    run(async () => {
                      await moderateSubmission(id, item.id, decision);
                      setQueue((q) => (q ?? []).filter((x) => x.id !== item.id));
                      if (decision === "approved") setView(await getListing(id));
                    })
                  }
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function BusinessPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
