import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TripDetail } from "@/components/TripDetail";
import { requireUser } from "@/lib/auth";
import { siteOrigin } from "@/lib/site";
import { getTrip } from "@/lib/trips";
import type { TripRecord } from "@/lib/trips-client";

export const metadata: Metadata = { title: "Trip" };

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const trip = await getTrip(user.id, (await params).id);
  if (!trip) notFound();
  const record: TripRecord = { ...trip, createdAt: trip.createdAt.toISOString(), updatedAt: trip.updatedAt.toISOString() };
  return <TripDetail initial={record} origin={await siteOrigin()} />;
}
