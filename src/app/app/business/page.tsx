"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Empty, ErrorNote } from "@/components/ui";
import { myBusinesses, type MyBusiness } from "@/lib/business-client";

export default function MyBusinessesPage() {
  const [list, setList] = useState<MyBusiness[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    myBusinesses().then(setList).catch((e) => setError(e instanceof Error ? e.message : "Could not load."));
  }, []);
  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <h1 className="text-2xl font-extrabold tracking-tight">My businesses</h1>
      <p className="text-sm text-muted">Listings you&apos;ve claimed. Open one to edit, sync, see traffic and review customer updates.</p>
      {error && <ErrorNote>{error}</ErrorNote>}
      {list && list.length === 0 && <div className="mt-4"><Empty>No claimed businesses yet. Open any place from a search and tap “This is my business”.</Empty></div>}
      <ul className="mt-4 flex flex-col gap-2">
        {list?.map((b) => (
          <li key={b.id}>
            <Link href={`/app/business/${b.id}`} className="block rounded-xl border border-border bg-surface p-3 hover:border-blue">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{b.name}</h2>
                <div className="flex gap-1">
                  {b.plan.sponsor ? <Badge tone="paid">Sponsored until {new Date(b.plan.sponsorUntil!).toLocaleDateString()}</Badge> : b.plan.basic ? <Badge tone="blue">Basic</Badge> : <Badge>No plan</Badge>}
                </div>
              </div>
              <p className="text-xs text-muted">{b.address}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
