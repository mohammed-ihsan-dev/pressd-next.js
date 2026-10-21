// Admin-editable audit thresholds and crawl limits (validated, bounded).

import { eq } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { seoSettings } from "../db/schema.ts";
import { DEFAULT_THRESHOLDS, type AuditThresholds } from "../core/rules.ts";
import { clampLimits, DEFAULT_LIMITS, type CrawlLimits } from "../core/crawler.ts";

export interface Settings {
  thresholds: AuditThresholds;
  crawlLimits: CrawlLimits;
  updatedBy: string | null;
  updatedAt: Date | null;
}

export async function getSettings(db: Db): Promise<Settings> {
  const [row] = await db.select().from(seoSettings).where(eq(seoSettings.id, "default"));
  return {
    thresholds: { ...DEFAULT_THRESHOLDS, ...((row?.thresholds as Partial<AuditThresholds>) ?? {}) },
    crawlLimits: clampLimits(row?.crawlLimits as Partial<CrawlLimits>),
    updatedBy: row?.updatedBy ?? null,
    updatedAt: row?.updatedAt ?? null,
  };
}

export class SettingsValidationError extends Error {}

const T_RANGE: Record<keyof AuditThresholds, [number, number]> = { titleMin: [5, 100], titleMax: [20, 200], descriptionMin: [20, 300], descriptionMax: [50, 500] };
const L_EDITABLE = ["maxPages", "maxDepth", "concurrency", "requestTimeoutMs", "maxAssetChecks"] as const;

export function validateSettings(input: { thresholds?: Record<string, unknown>; crawlLimits?: Record<string, unknown> }) {
  const thresholds: Partial<AuditThresholds> = {};
  for (const [k, [lo, hi]] of Object.entries(T_RANGE) as [keyof AuditThresholds, [number, number]][]) {
    const v = input.thresholds?.[k];
    if (v === undefined) continue;
    if (typeof v !== "number" || !Number.isInteger(v) || v < lo || v > hi) throw new SettingsValidationError(`${k} must be a whole number between ${lo} and ${hi}`);
    thresholds[k] = v;
  }
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  if (t.titleMin >= t.titleMax) throw new SettingsValidationError("Title minimum must be below the maximum");
  if (t.descriptionMin >= t.descriptionMax) throw new SettingsValidationError("Description minimum must be below the maximum");
  const limits: Partial<CrawlLimits> = {};
  for (const k of L_EDITABLE) {
    const v = input.crawlLimits?.[k];
    if (v === undefined) continue;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1) throw new SettingsValidationError(`${k} must be a positive whole number`);
    limits[k] = v;
  }
  const clamped = clampLimits(limits);
  return { thresholds, crawlLimits: Object.fromEntries(L_EDITABLE.filter((k) => limits[k] !== undefined).map((k) => [k, clamped[k]])) };
}

export async function saveSettings(db: Db, input: { thresholds?: Record<string, unknown>; crawlLimits?: Record<string, unknown> }, actor: string) {
  const v = validateSettings(input);
  await db
    .insert(seoSettings)
    .values({ id: "default", thresholds: v.thresholds, crawlLimits: v.crawlLimits, updatedBy: actor, updatedAt: new Date() })
    .onConflictDoUpdate({ target: seoSettings.id, set: { thresholds: v.thresholds, crawlLimits: v.crawlLimits, updatedBy: actor, updatedAt: new Date() } });
  return getSettings(db);
}

export { DEFAULT_LIMITS, DEFAULT_THRESHOLDS };
