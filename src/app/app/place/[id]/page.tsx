"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AddToTripButton } from "@/components/AddToTrip";
import { Map } from "@/components/Map";
import { SendToPhone } from "@/components/SendToPhone";
import { Badge, Button, ErrorNote } from "@/components/ui";
import { CATEGORY_BY_ID } from "@/lib/categories";
import { appleMapsLink, mapsLink } from "@/lib/client";
import { getListing, money, submitUpdate, trackClick, uploadPhoto } from "@/lib/listing-client";
import type { ListingView } from "@/lib/listing-view";
import { CATEGORY_COLORS } from "@/lib/markers";

const field = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none ring-blue/40 focus:ring-2";

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <span className="inline-flex" role={onChange ? "radiogroup" : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} className={`text-lg ${n <= value ? "text-orange" : "text-border"} ${onChange ? "cursor-pointer" : "cursor-default"}`} aria-label={`${n} star${n === 1 ? "" : "s"}`}>
          ★
        </button>
      ))}
    </span>
  );
}

export default function PlacePage() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<ListingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<"review" | "photo" | "menu" | "special" | "hours" | "info" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [value, setValue] = useState("");
  const [infoField, setInfoField] = useState<"name" | "address" | "phone" | "website" | "hours" | "description">("hours");
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");

  useEffect(() => {
    getListing(id)
      .then(setView)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load this place."));
  }, [id]);

  if (error) return <div className="p-4"><ErrorNote>{error}</ErrorNote></div>;
  if (!view) return <p className="p-4 text-sm text-muted">Loading…</p>;
  const b = view.business;
  const cat = CATEGORY_BY_ID[b.category];
  const place = { id: b.placeId, name: b.name, category: b.category, lat: b.lat, lng: b.lng, address: b.address, website: b.website, phone: b.phone, openingHours: b.hours };

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setNotice(null);
    try {
      const r = await submitUpdate(id, body);
      setNotice(r.submission.flagged ? "Thanks. This update was sent to RouteDiscover for review before it goes live." : b.claimed ? "Thanks. The business owner will review your update." : "Thanks. Your update is pending review.");
      setPanel(null);
      setText("");
      setValue("");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:h-[calc(100vh-57px)] md:flex-row">
      <section className="flex min-h-0 flex-col gap-3 p-4 md:w-[520px] md:shrink-0 md:overflow-y-auto">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl" style={{ background: `${CATEGORY_COLORS[b.category]}22` }} aria-hidden>
              {cat.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold tracking-tight">{b.name}</h1>
              <p className="text-sm text-muted">
                {cat.label}
                {b.cuisine ? ` · ${b.cuisine}` : ""}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {b.sponsored && <Badge tone="paid">★ Sponsored</Badge>}
                {b.claimed ? <Badge tone="blue">✓ Verified by owner</Badge> : <Badge>Unclaimed listing</Badge>}
                {view.rating ? (
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Stars value={Math.round(view.rating.rating)} /> {view.rating.rating.toFixed(1)} · {view.rating.count} review{view.rating.count === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {b.address && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Address</dt>
                <dd>{b.address}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Hours</dt>
              <dd>{b.hours ?? <span className="text-muted">Not listed yet</span>}</dd>
            </div>
            {b.phone && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Phone</dt>
                <dd>
                  <a className="text-blue hover:underline" href={`tel:${b.phone}`} onClick={() => trackClick(id, "call")}>{b.phone}</a>
                </dd>
              </div>
            )}
            {b.website && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Website</dt>
                <dd>
                  <a className="break-all text-blue hover:underline" href={b.website} target="_blank" rel="noreferrer" onClick={() => trackClick(id, "website")}>{b.website.replace(/^https?:\/\//, "")}</a>
                </dd>
              </div>
            )}
          </dl>
          {b.description && <p className="mt-3 whitespace-pre-wrap text-sm">{b.description}</p>}
          {!b.description && b.google?.summary && <p className="mt-3 text-sm">{b.google.summary}</p>}
          {b.google && (b.google.rating || b.google.priceLevel) && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {b.google.rating ? (
                <span className="inline-flex items-center gap-1">
                  <Stars value={Math.round(b.google.rating)} /> {b.google.rating.toFixed(1)}
                  {b.google.ratingCount ? <span className="text-muted">({b.google.ratingCount.toLocaleString()} on Google)</span> : null}
                </span>
              ) : null}
              {b.google.priceLevel && <Badge>{b.google.priceLevel.replace("PRICE_LEVEL_", "").toLowerCase().replace("_", " ")}</Badge>}
              {b.google.mapsUri && (
                <a className="text-xs text-blue hover:underline" href={b.google.mapsUri} target="_blank" rel="noreferrer" onClick={() => trackClick(id, "maps")}>Open in Google Maps</a>
              )}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <a className="text-blue hover:underline" href={mapsLink(b, b.name)} target="_blank" rel="noreferrer" onClick={() => trackClick(id, "maps")}>Google Maps</a>
            <a className="text-blue hover:underline" href={appleMapsLink(b, b.name)} target="_blank" rel="noreferrer" onClick={() => trackClick(id, "maps")}>Apple Maps</a>
            <AddToTripButton place={place} />
          </div>
          <div className="mt-2">
            <SendToPhone path={`/app/place/${b.id}`} title={b.name} compact />
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Listing data from {b.provider === "google" ? "Google" : b.provider === "osm" ? "OpenStreetMap" : b.provider === "ocm" ? "Open Charge Map" : b.provider === "demo" ? "sample data" : "online sources"}, synced {new Date(b.sourceSyncedAt).toLocaleDateString()}
            {b.claimed ? ", with updates from the owner" : ""}.
          </p>
        </div>

        <div className="rounded-2xl border border-orange/50 bg-cream p-4">
          {view.canManage ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold">You manage this business</h2>
                <p className="text-xs text-muted">{view.plan.sponsor ? `Sponsored until ${new Date(view.plan.sponsorUntil!).toLocaleDateString()}` : view.plan.basic ? "Basic monitoring plan" : "No active plan"}</p>
              </div>
              <Link href={`/app/business/${b.id}`} className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white">Manage listing →</Link>
            </div>
          ) : b.claimed ? (
            <p className="text-sm">This listing is verified and maintained by the business owner.</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold">Is this your business?</h2>
                <p className="text-xs text-muted">Claim it to edit hours, menu, specials and photos, see your traffic, and sponsor top placement. From {money(view.pricing.basicPriceCents, view.pricing.currency)}/month.</p>
              </div>
              <Link href={`/app/business/claim/${b.id}`} className="rounded-xl bg-gradient-to-r from-coral to-orange px-4 py-2 text-sm font-semibold text-white shadow">🏪 This is my business</Link>
            </div>
          )}
        </div>

        {(b.specials || view.specials.length > 0) && (
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <h2 className="font-bold">Specials</h2>
            {b.specials && <p className="mt-1 whitespace-pre-wrap text-sm">{b.specials}</p>}
            {view.specials.map((s) => (
              <p key={s.id} className="mt-2 whitespace-pre-wrap rounded-lg bg-background p-2 text-sm">{s.text} <span className="text-xs text-muted">· traveler tip, {new Date(s.createdAt).toLocaleDateString()}</span></p>
            ))}
          </div>
        )}
        {(b.menu || view.menus.length > 0) && (
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <h2 className="font-bold">Menu</h2>
            {b.menu && <pre className="mt-1 whitespace-pre-wrap font-sans text-sm">{b.menu}</pre>}
            {view.menus.map((m) => (
              <pre key={m.id} className="mt-2 whitespace-pre-wrap rounded-lg bg-background p-2 font-sans text-sm">{m.text}</pre>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Photos</h2>
            <Button variant="ghost" onClick={() => setPanel(panel === "photo" ? null : "photo")}>📷 Add a photo</Button>
          </div>
          {view.photos.length === 0 && !(b.google?.photoNames?.length) ? <p className="mt-1 text-sm text-muted">No photos yet. Be the first.</p> : (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {view.photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={`/api/photos/${p.id}`} alt={p.caption ?? b.name} title={p.caption} className="aspect-square w-full rounded-lg object-cover" loading="lazy" />
              ))}
              {(b.google?.photoNames ?? []).slice(0, 6).map((n) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={n} src={`/api/google/photo?name=${encodeURIComponent(n)}&w=600`} alt={b.name} title="Photo from Google" className="aspect-square w-full rounded-lg object-cover" loading="lazy" />
              ))}
            </div>
          )}
          {b.google?.photoNames?.length ? <p className="mt-1 text-[11px] text-muted">Some photos from Google.</p> : null}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Reviews</h2>
            <Button variant="ghost" onClick={() => setPanel(panel === "review" ? null : "review")}>✍️ Write a review</Button>
          </div>
          {b.google?.reviews?.length ? (
            <div className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">From Google</p>
              <ul className="mt-1 flex flex-col gap-2">
                {b.google.reviews.map((r, i) => (
                  <li key={i} className="rounded-lg bg-background p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <Stars value={r.rating} />
                      <span className="text-xs text-muted">{r.author} · {r.time}</span>
                    </div>
                    {r.text && <p className="mt-1 line-clamp-4">{r.text}</p>}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">From RouteDiscover travelers</p>
            </div>
          ) : null}
          {view.reviews.length === 0 ? <p className="mt-1 text-sm text-muted">No traveler reviews yet.</p> : (
            <ul className="mt-2 flex flex-col gap-2">
              {view.reviews.map((r) => (
                <li key={r.id} className="rounded-lg bg-background p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <Stars value={r.rating} />
                    <span className="text-xs text-muted">{r.author} · {new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.text && <p className="mt-1">{r.text}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <h2 className="font-bold">Know something we don&apos;t?</h2>
          <p className="text-xs text-muted">Suggestions are reviewed by the business owner and audited by RouteDiscover before they appear.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setPanel("hours")}>🕒 Suggest hours</Button>
            <Button variant="secondary" onClick={() => setPanel("special")}>🏷️ Post a special</Button>
            <Button variant="secondary" onClick={() => setPanel("menu")}>📋 Add a menu</Button>
            <Button variant="secondary" onClick={() => setPanel("info")}>✏️ Suggest a correction</Button>
          </div>
        </div>

        {notice && <p className="rounded-lg border border-green/40 bg-green/10 px-3 py-2 text-sm">{notice}</p>}

        {panel && (
          <form
            className="flex flex-col gap-2 rounded-2xl border-2 border-blue bg-surface p-4 shadow-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              if (panel === "photo") {
                if (!file) return;
                setBusy(true);
                setNotice(null);
                try {
                  const r = await uploadPhoto(id, file, caption);
                  setNotice(r.status === "approved" ? "Photo added." : "Thanks. Your photo is pending review.");
                  setPanel(null);
                  setFile(null);
                  setCaption("");
                  if (r.status === "approved") setView(await getListing(id));
                } catch (err) {
                  setNotice(err instanceof Error ? err.message : "Upload failed.");
                } finally {
                  setBusy(false);
                }
                return;
              }
              if (panel === "review") return send({ type: "review", rating, text });
              if (panel === "hours") return send({ type: "hours", value, text });
              if (panel === "info") return send({ type: "info", field: infoField, value, text });
              return send({ type: panel, text });
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {panel === "review" ? "Your review" : panel === "photo" ? "Add a photo" : panel === "hours" ? "Suggest hours" : panel === "info" ? "Suggest a correction" : panel === "menu" ? "Add a menu" : "Post a special"}
              </h3>
              <Button variant="ghost" type="button" onClick={() => setPanel(null)}>✕</Button>
            </div>
            {panel === "review" && (
              <>
                <Stars value={rating} onChange={setRating} />
                <textarea className={field} rows={3} placeholder="What should other travelers know?" value={text} onChange={(e) => setText(e.target.value)} />
              </>
            )}
            {panel === "photo" && (
              <>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
                <input className={field} placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
              </>
            )}
            {panel === "hours" && (
              <>
                <input className={field} placeholder="Mo-Fr 09:00-17:00; Sa 10:00-14:00" value={value} onChange={(e) => setValue(e.target.value)} required />
                <input className={field} placeholder="How do you know? (optional)" value={text} onChange={(e) => setText(e.target.value)} />
              </>
            )}
            {panel === "info" && (
              <>
                <select className={field} value={infoField} onChange={(e) => setInfoField(e.target.value as typeof infoField)}>
                  {(["hours", "address", "phone", "website", "name", "description"] as const).map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <input className={field} placeholder="Correct value" value={value} onChange={(e) => setValue(e.target.value)} required />
                <input className={field} placeholder="Why? (optional)" value={text} onChange={(e) => setText(e.target.value)} />
              </>
            )}
            {(panel === "menu" || panel === "special") && (
              <textarea className={field} rows={panel === "menu" ? 6 : 3} placeholder={panel === "menu" ? "Paste the menu or list a few favorites with prices" : "Tuesday: half-price pie after 4pm"} value={text} onChange={(e) => setText(e.target.value)} required />
            )}
            <div>
              <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Submit for review"}</Button>
            </div>
          </form>
        )}
      </section>
      <section className="relative min-h-0 flex-1 h-[40vh] md:h-auto">
        <Map markers={[{ id: b.id, lat: b.lat, lng: b.lng, label: b.name, emoji: cat.emoji, color: CATEGORY_COLORS[b.category], sub: b.address }]} fitKey={b.id} />
      </section>
    </div>
  );
}
