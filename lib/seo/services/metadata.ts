// Publishing metadata overrides, with full before/after history for restore.

import { desc, eq } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { metadataChanges, metadataOverrides } from "../db/schema.ts";
import type { MetaOverride } from "../core/metadata.ts";
import type { PageFacts } from "../core/html.ts";

/** Public routes that exist in the app (source of truth: app/(site)). */
export const PUBLIC_PAGES = [
  {
    path: "/",
    type: "Home — single-page site",
    source: "app/(site)/layout.tsx (metadata) · app/(site)/page.tsx",
    editable: true,
    note: "About, Menu, Visit and the other sections are #anchors on this one URL, so they share this page's metadata. Giving them their own titles and descriptions would require turning them into separate routes.",
  },
] as const;

export function isEditablePath(path: string) {
  return PUBLIC_PAGES.some((p) => p.path === path && p.editable);
}

export async function getOverride(db: Db, path: string): Promise<{ fields: MetaOverride; version: number; publishedBy: string; publishedAt: Date } | null> {
  const [row] = await db.select().from(metadataOverrides).where(eq(metadataOverrides.path, path));
  return row ? { fields: row.fields as MetaOverride, version: row.version, publishedBy: row.publishedBy, publishedAt: row.publishedAt } : null;
}

export async function publishOverride(db: Db, path: string, fields: MetaOverride, actor: string, action: "publish" | "restore" | "reset" = "publish") {
  const cur = await getOverride(db, path);
  const version = (cur?.version ?? 0) + 1;
  const empty = !Object.keys(fields).length;
  if (empty) await db.delete(metadataOverrides).where(eq(metadataOverrides.path, path));
  else
    await db
      .insert(metadataOverrides)
      .values({ path, fields, version, publishedBy: actor, publishedAt: new Date() })
      .onConflictDoUpdate({ target: metadataOverrides.path, set: { fields, version, publishedBy: actor, publishedAt: new Date() } });
  const [change] = await db
    .insert(metadataChanges)
    .values({ path, actor, action: empty && action === "publish" ? "reset" : action, before: cur?.fields ?? {}, after: fields, version })
    .returning();
  return change;
}

export async function changeHistory(db: Db, path: string, limit = 50) {
  return db.select().from(metadataChanges).where(eq(metadataChanges.path, path)).orderBy(desc(metadataChanges.at)).limit(limit);
}

export async function getChange(db: Db, id: number) {
  const [row] = await db.select().from(metadataChanges).where(eq(metadataChanges.id, id));
  return row ?? null;
}

/** Compares the live rendered page against what was published. */
export function compareRendered(expected: { title?: string; description?: string; canonical?: string; robotsNoindex?: boolean }, facts: PageFacts) {
  const mismatches: string[] = [];
  if (expected.title !== undefined && facts.titles[0] !== expected.title) mismatches.push(`title is "${facts.titles[0] ?? "(none)"}"`);
  if (expected.description !== undefined && facts.metaDescriptions[0] !== expected.description) mismatches.push(`description is "${facts.metaDescriptions[0] ?? "(none)"}"`);
  // Compare as URLs: Next renders the root canonical without the trailing slash.
  const sameUrl = (a: string | undefined, b: string) => {
    try {
      return !!a && new URL(a).href === new URL(b).href;
    } catch {
      return false;
    }
  };
  if (expected.canonical !== undefined && !sameUrl(facts.canonicals[0], expected.canonical)) mismatches.push(`canonical is "${facts.canonicals[0] ?? "(none)"}"`);
  if (expected.robotsNoindex !== undefined) {
    const noindex = facts.metaRobots.some((r) => /\bnoindex\b/.test(r));
    if (noindex !== expected.robotsNoindex) mismatches.push(`robots is "${facts.metaRobots.join(", ") || "(none)"}"`);
  }
  return mismatches;
}

export async function recordVerification(db: Db, changeId: number, verified: boolean, note: string) {
  await db.update(metadataChanges).set({ verified, verificationNote: note.slice(0, 500) }).where(eq(metadataChanges.id, changeId));
}
