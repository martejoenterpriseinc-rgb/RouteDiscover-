import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type UsageKind = "places" | "routes" | "geocoding" | "photos";

export const currentMonth = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export class CapReached extends Error {
  constructor(
    public kind: UsageKind,
    public cap: number,
  ) {
    super(`Google ${kind} monthly cap of ${cap} reached; using open providers until next month`);
  }
}

/* Small in-process cache so a burst of calls doesn't hammer the usage table. */
const local = new Map<string, number>();

async function readCount(provider: string, kind: UsageKind, month: string): Promise<number> {
  const key = `${month}:${provider}:${kind}`;
  const cached = local.get(key);
  if (cached != null) return cached;
  const db = await getDb();
  const row = await db.query.apiUsage.findFirst({ where: and(eq(schema.apiUsage.month, month), eq(schema.apiUsage.provider, provider), eq(schema.apiUsage.kind, kind)) });
  const n = row?.count ?? 0;
  local.set(key, n);
  return n;
}

/**
 * Reserve `n` calls against this month's cap. Throws CapReached when the cap
 * would be exceeded, which makes the provider chain fall through to the free
 * providers. Pass cap 0 for unlimited.
 */
export async function consume(provider: string, kind: UsageKind, cap: number, n = 1): Promise<number> {
  const month = currentMonth();
  const key = `${month}:${provider}:${kind}`;
  const current = await readCount(provider, kind, month);
  if (cap > 0 && current + n > cap) throw new CapReached(kind, cap);
  local.set(key, current + n);
  const db = await getDb();
  await db
    .insert(schema.apiUsage)
    .values({ month, provider, kind, count: n })
    .onConflictDoUpdate({ target: [schema.apiUsage.month, schema.apiUsage.provider, schema.apiUsage.kind], set: { count: sql`${schema.apiUsage.count} + ${n}`, updatedAt: new Date() } });
  return current + n;
}

export type UsageReport = { month: string; providers: Record<string, Record<string, number>> };

export async function usageReport(month = currentMonth()): Promise<UsageReport> {
  const db = await getDb();
  const rows = await db.select().from(schema.apiUsage).where(eq(schema.apiUsage.month, month));
  const providers: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    providers[r.provider] ??= {};
    providers[r.provider][r.kind] = r.count;
  }
  return { month, providers };
}

/** Test helper: forget the in-process counters. */
export function resetUsageCache() {
  local.clear();
}
