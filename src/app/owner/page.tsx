import type { Metadata } from "next";
import Link from "next/link";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { getOwnerStats } from "@/lib/stats";

export const metadata: Metadata = { title: "Owner dashboard" };

export default async function OwnerPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days } = await searchParams;
  const range = Math.min(365, Math.max(7, Number(days || 30)));
  const stats = await getOwnerStats(range);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted">Everything about how RouteDiscover is doing, in one place.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-0.5 text-sm">
          {[7, 30, 90].map((d) => (
            <Link key={d} href={`/owner?days=${d}`} className={`rounded-md px-3 py-1 font-medium ${range === d ? "bg-navy text-white" : "text-muted hover:text-foreground"}`}>
              {d} days
            </Link>
          ))}
        </div>
      </div>
      <OwnerDashboard stats={stats} />
    </>
  );
}
