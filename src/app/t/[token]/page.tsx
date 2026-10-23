import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/AppNav";
import { PlaceCard } from "@/components/Cards";
import { TripMap } from "@/components/TripMap";
import { Badge } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { fmtDuration, fmtMiles } from "@/lib/geo";
import { getPublicTrip } from "@/lib/trips";
import { fmtDate } from "@/lib/dates";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const trip = await getPublicTrip((await params).token);
  return { title: trip ? `${trip.name} · shared trip` : "Trip" };
}

/** Public, read-only view of a shared trip. */
export default async function SharedTripPage({ params }: { params: Promise<{ token: string }> }) {
  const trip = await getPublicTrip((await params).token);
  if (!trip) notFound();
  const user = await getCurrentUser();
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/brand/mark.png" alt="" width={36} height={43} className="h-10 w-auto" />
            <Wordmark className="text-xl" />
          </Link>
          <span className="ml-auto text-sm text-muted">Shared trip</span>
          {!user && (
            <Link href="/signup" className="rounded-full bg-gradient-to-r from-coral to-orange px-4 py-1.5 text-sm font-semibold text-white">
              Plan your own
            </Link>
          )}
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:h-[calc(100vh-57px)] md:flex-row">
        <section className="flex min-h-0 flex-col gap-3 p-4 md:w-[440px] md:shrink-0 md:overflow-y-auto">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <h1 className="text-xl font-extrabold tracking-tight">{trip.name}</h1>
            <p className="text-sm text-muted">
              {trip.origin.label} → {trip.destination.label}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {fmtDate(trip.startDate)}
              {trip.endDate !== trip.startDate ? ` – ${fmtDate(trip.endDate)}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {trip.distanceMiles ? <Badge>{fmtMiles(trip.distanceMiles)}</Badge> : null}
              {trip.durationMinutes ? <Badge>{fmtDuration(trip.durationMinutes)} driving</Badge> : null}
              <Badge>{trip.stops.length} stops</Badge>
            </div>
            {trip.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{trip.notes}</p>}
          </div>
          {trip.stops.length > 0 && (
            <ul className="flex flex-col gap-2">
              {trip.stops.map((s) => (
                <PlaceCard key={s.id} place={s} />
              ))}
            </ul>
          )}
          <p className="text-center text-xs text-muted">
            Made with RouteDiscover.{" "}
            <Link href="/signup" className="text-blue hover:underline">
              Create your own trip →
            </Link>
          </p>
        </section>
        <section className="relative min-h-0 flex-1 h-[50vh] md:h-auto">
          <TripMap route={trip.routeGeometry} stops={trip.stops} />
        </section>
      </div>
    </div>
  );
}
