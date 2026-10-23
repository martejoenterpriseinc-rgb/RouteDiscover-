import "server-only";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

declare global {
  var __routediscoverDb: Promise<Db> | undefined;
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 10 });
    const db = drizzlePg(pool, { schema });
    await migratePg(db, { migrationsFolder: MIGRATIONS });
    return db;
  }
  // Embedded Postgres (PGlite) for development, tests and single-box deploys.
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), "data", "pglite");
  const client = process.env.PGLITE_DIR === ":memory:" ? new PGlite() : new PGlite(dir);
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  return db;
}

/** Shared connection, migrated on first use. Survives dev hot reloads. */
export function getDb(): Promise<Db> {
  if (!globalThis.__routediscoverDb) {
    globalThis.__routediscoverDb = connect().catch((err) => {
      globalThis.__routediscoverDb = undefined;
      throw err;
    });
  }
  return globalThis.__routediscoverDb;
}

export { schema };
