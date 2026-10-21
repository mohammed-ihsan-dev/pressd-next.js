// Database access for the SEO dashboard.
//  - DATABASE_URL set → Neon serverless Postgres over HTTP.
//  - Not set, outside production → embedded PGlite in ./.data (local dev only),
//    migrated automatically so the dashboard runs without any credentials.
//  - Not set in production → DatabaseUnavailableError (fail closed).

import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema.ts";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("DATABASE_URL is not configured");
    this.name = "DatabaseUnavailableError";
  }
}

const g = globalThis as unknown as { __seoDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle({ client: neon(url), schema }) as unknown as Db;
  }
  if (process.env.NODE_ENV === "production") throw new DatabaseUnavailableError();
  return openPglite(path.join(process.cwd(), ".data", "seo-pglite"));
}

/** Embedded Postgres for local development and tests. `dataDir` null = in memory. */
export async function openPglite(dataDir: string | null): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dataDir) mkdirSync(path.dirname(dataDir), { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  if (!g.__seoDb) {
    g.__seoDb = connect().catch((e) => {
      g.__seoDb = undefined; // allow a retry on the next request
      throw e;
    });
  }
  return g.__seoDb;
}

export { schema };
