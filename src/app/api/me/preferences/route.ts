import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Preferences } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { parseCategories } from "@/lib/categories";
import { parseGeoResult } from "@/lib/api";
import { body, handle, json } from "@/lib/http";

function sanitize(input: Record<string, unknown>, current: Preferences): Preferences {
  const num = (v: unknown, min: number, max: number, d: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
    typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : d;
  const cats = Array.isArray(input.categories) ? parseCategories(input.categories.join(",")) : current.categories;
  return {
    radiusMiles: num(input.radiusMiles, 1, 50, current.radiusMiles),
    categories: cats.length ? cats : current.categories,
    units: oneOf(input.units, ["mi", "km"] as const, current.units),
    vehicle: oneOf(input.vehicle, ["tesla", "other-ev", "gas"] as const, current.vehicle),
    connector: oneOf(input.connector, ["nacs", "ccs", "j1772", "none"] as const, current.connector),
    home: input.home === null ? undefined : (parseGeoResult(input.home) ?? current.home),
    walkRadius: num(input.walkRadius, 0.25, 2, current.walkRadius),
    marketingOptIn: typeof input.marketingOptIn === "boolean" ? input.marketingOptIn : current.marketingOptIn,
  };
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    const db = await getDb();
    const row = await db.query.preferences.findFirst({ where: eq(schema.preferences.userId, user.id) });
    const next = sanitize(await body(req), row?.data ?? schema.DEFAULT_PREFERENCES);
    await db
      .insert(schema.preferences)
      .values({ userId: user.id, data: next })
      .onConflictDoUpdate({ target: schema.preferences.userId, set: { data: next, updatedAt: new Date() } });
    return json({ ok: true, preferences: next });
  } catch (err) {
    return handle(err);
  }
}

export async function PATCH(req: Request) {
  const b = await body(req);
  try {
    const user = await requireUser();
    const name = typeof b.name === "string" ? b.name.trim().slice(0, 120) : null;
    if (name !== null && name.length > 0) {
      const db = await getDb();
      await db.update(schema.users).set({ name }).where(eq(schema.users.id, user.id));
    }
    return json({ ok: true });
  } catch (err) {
    return handle(err);
  }
}
