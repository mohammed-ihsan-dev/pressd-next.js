// PageSpeed Insights runs: server-side only, rate-limited, stored for comparison.

import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { performanceRuns } from "../db/schema.ts";
import { buildPsiUrl, parsePsi, type PsiResult, type Strategy } from "../core/pagespeed.ts";

export const MIN_RERUN_MS = 2 * 60_000; // same URL + strategy
export const MAX_RUNS_PER_HOUR = 20; // per user

export class PerfLimitError extends Error {
  readonly retryAfterS: number;
  constructor(message: string, retryAfterS: number) {
    super(message);
    this.retryAfterS = retryAfterS;
  }
}

export class PsiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function checkLimits(db: Db, url: string, strategy: Strategy, actor: string, now = new Date()) {
  const [recent] = await db
    .select({ createdAt: performanceRuns.createdAt })
    .from(performanceRuns)
    .where(and(eq(performanceRuns.url, url), eq(performanceRuns.strategy, strategy), gt(performanceRuns.createdAt, new Date(now.getTime() - MIN_RERUN_MS))))
    .orderBy(desc(performanceRuns.createdAt))
    .limit(1);
  if (recent) {
    const wait = Math.ceil((recent.createdAt.getTime() + MIN_RERUN_MS - now.getTime()) / 1000);
    throw new PerfLimitError(`This URL was tested on ${strategy} moments ago. Try again in ${wait}s.`, wait);
  }
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(performanceRuns)
    .where(and(eq(performanceRuns.requestedBy, actor), gt(performanceRuns.createdAt, new Date(now.getTime() - 3600_000))));
  if (n >= MAX_RUNS_PER_HOUR) throw new PerfLimitError(`Limit of ${MAX_RUNS_PER_HOUR} PageSpeed tests per hour reached.`, 600);
}

/** Calls PSI for one URL/strategy and stores the outcome (success or failure). */
export async function runPageSpeed(db: Db, opts: { url: string; strategy: Strategy; actor: string; apiKey: string | null; fetch?: typeof fetch }) {
  await checkLimits(db, opts.url, opts.strategy, opts.actor);
  let result: PsiResult | null = null;
  let error: string | null = null;
  try {
    const res = await (opts.fetch ?? fetch)(buildPsiUrl(opts.url, opts.strategy, opts.apiKey), { signal: AbortSignal.timeout(55_000) });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: { message?: string } };
    if (!res.ok) {
      const msg = json.error?.message ?? `HTTP ${res.status}`;
      throw new PsiError(res.status === 429 ? "PageSpeed Insights quota reached — add PAGESPEED_INSIGHTS_API_KEY or try later." : `PageSpeed Insights error: ${msg.replace(/key=[^&\s]+/g, "key=…")}`, res.status);
    }
    result = parsePsi(json, opts.strategy);
  } catch (e) {
    error = e instanceof Error ? (e.name === "TimeoutError" ? "PageSpeed Insights did not respond within 55 seconds." : e.message) : "PageSpeed request failed";
  }
  const [row] = await db
    .insert(performanceRuns)
    .values({ url: opts.url, strategy: opts.strategy, requestedBy: opts.actor, status: result ? "completed" : "failed", result, error })
    .returning();
  return row;
}

export async function history(db: Db, limit = 60) {
  return db.select().from(performanceRuns).orderBy(desc(performanceRuns.createdAt)).limit(Math.min(limit, 200));
}
