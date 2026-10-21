import "server-only";
// The only SEO-dashboard code the public site runs: reading published
// metadata overrides. It must never break or slow the public page, so it is
// time-boxed and falls back to the code defaults on any problem.

import { existsSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "./db/client.ts";
import { metadataOverrides } from "./db/schema.ts";
import type { MetaOverride } from "./core/metadata.ts";

function databaseAvailable(): boolean {
  if (process.env.DATABASE_URL) return true;
  // local development: only if the dashboard has already created its database
  return process.env.NODE_ENV !== "production" && existsSync(path.join(process.cwd(), ".data", "seo-pglite"));
}

export async function publishedOverride(pagePath: string): Promise<MetaOverride | null> {
  if (!databaseAvailable()) return null;
  try {
    const read = (async () => {
      const db = await getDb();
      const [row] = await db.select({ fields: metadataOverrides.fields }).from(metadataOverrides).where(eq(metadataOverrides.path, pagePath));
      return (row?.fields as MetaOverride | undefined) ?? null;
    })();
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
    return await Promise.race([read, timeout]);
  } catch (e) {
    console.error("[seo] metadata override unavailable; using defaults:", e instanceof Error ? e.message : e);
    return null;
  }
}
