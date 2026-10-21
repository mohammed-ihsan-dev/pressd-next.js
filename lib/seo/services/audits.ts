// Technical audit runs: start → bounded steps → finalise → persistent issues.
// Designed for serverless hosting: each step does a time-boxed slice of work
// and saves its state; the dashboard calls the next step until done.

import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { auditAssets, auditPages, auditRuns, issueEvents, issues } from "../db/schema.ts";
import {
  checkSingleAsset,
  clampLimits,
  crawlStep,
  fetchSinglePage,
  initialState,
  type AssetCheck,
  type CrawlDeps,
  type CrawlLimits,
  type CrawlState,
  type FetchedPage,
} from "../core/crawler.ts";
import { countBySeverity, evaluate, type AuditThresholds, type DetectedIssue } from "../core/rules.ts";

export const STEP_BUDGET_MS = 20_000;
const STALE_AFTER_MS = 10 * 60_000;

export class AuditBusyError extends Error {
  readonly runId: string | null;
  constructor(runId: string | null) {
    super("An audit is already running");
    this.runId = runId;
  }
}

export class AuditStateError extends Error {}

/** Marks runs with no progress for 10 minutes as failed so a new audit can start. */
export async function expireStaleRuns(db: Db, now = new Date()) {
  await db
    .update(auditRuns)
    .set({ status: "failed", error: "Interrupted: no progress for 10 minutes (browser closed or function timed out). Start a new audit.", finishedAt: now, stepLockUntil: null })
    .where(and(eq(auditRuns.status, "running"), lt(auditRuns.heartbeatAt, new Date(now.getTime() - STALE_AFTER_MS))));
}

export async function startAudit(db: Db, opts: { site: URL; actor: string; limits?: Partial<CrawlLimits>; thresholds?: Partial<AuditThresholds> }) {
  await expireStaleRuns(db);
  try {
    const [run] = await db
      .insert(auditRuns)
      .values({
        status: "running",
        siteUrl: opts.site.origin + "/",
        startedBy: opts.actor,
        limits: clampLimits(opts.limits),
        thresholds: opts.thresholds ?? {},
        state: initialState(opts.site),
      })
      .returning({ id: auditRuns.id });
    return run.id;
  } catch (e) {
    // the partial unique index allows only one running audit
    if (/seo_audit_runs_one_running|unique|duplicate key/i.test(String((e as { cause?: unknown })?.cause ?? e))) {
      const [running] = await db.select({ id: auditRuns.id }).from(auditRuns).where(eq(auditRuns.status, "running"));
      throw new AuditBusyError(running?.id ?? null);
    }
    throw e;
  }
}

/** Atomically claims the run for one step; returns null if another step holds it. */
async function claim(db: Db, runId: string, budgetMs: number) {
  const now = new Date();
  const [row] = await db
    .update(auditRuns)
    .set({ stepLockUntil: new Date(now.getTime() + budgetMs + 30_000), heartbeatAt: now })
    .where(and(eq(auditRuns.id, runId), eq(auditRuns.status, "running"), or(isNull(auditRuns.stepLockUntil), lt(auditRuns.stepLockUntil, now))))
    .returning();
  return row ?? null;
}

async function insertChunks<T>(items: T[], size: number, fn: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) await fn(items.slice(i, i + size));
}

export interface StepOutcome {
  runId: string;
  status: string;
  phase: CrawlState["phase"];
  pagesCrawled: number;
  queued: number;
  done: boolean;
  busy?: boolean;
}

export async function stepAudit(db: Db, runId: string, deps: CrawlDeps, budgetMs = STEP_BUDGET_MS): Promise<StepOutcome> {
  const run = await claim(db, runId, budgetMs);
  if (!run) {
    const [cur] = await db.select().from(auditRuns).where(eq(auditRuns.id, runId));
    if (!cur) throw new AuditStateError("Audit not found");
    const st = cur.state as CrawlState;
    return { runId, status: cur.status, phase: st.phase, pagesCrawled: cur.pagesCrawled, queued: st.queue.length, done: cur.status !== "running", busy: cur.status === "running" };
  }
  try {
    const result = await crawlStep(run.state as CrawlState, deps, run.limits as Partial<CrawlLimits>, budgetMs);
    if (result.pages.length) {
      await insertChunks(result.pages, 50, (chunk) =>
        db.insert(auditPages).values(chunk.map((p) => ({ runId, url: p.url, data: p, status: p.status, title: p.facts?.titles[0] ?? null, fetchedAt: new Date(p.fetchedAt) }))).onConflictDoNothing(),
      );
    }
    if (result.assets.length) {
      await insertChunks(result.assets, 100, (chunk) => db.insert(auditAssets).values(chunk.map((a) => ({ runId, url: a.url, status: a.status, error: a.error }))).onConflictDoNothing());
    }
    // the run may have been cancelled while this step was working
    const [after] = await db
      .update(auditRuns)
      .set({ state: result.state, pagesCrawled: result.state.pagesDone, heartbeatAt: new Date(), stepLockUntil: null })
      .where(and(eq(auditRuns.id, runId), eq(auditRuns.status, "running")))
      .returning({ id: auditRuns.id });
    if (!after) return { runId, status: "cancelled", phase: result.state.phase, pagesCrawled: result.state.pagesDone, queued: 0, done: true };
    if (result.done) {
      await finalise(db, runId);
      return { runId, status: "completed", phase: "done", pagesCrawled: result.state.pagesDone, queued: 0, done: true };
    }
    return { runId, status: "running", phase: result.state.phase, pagesCrawled: result.state.pagesDone, queued: result.state.queue.length, done: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Audit step failed";
    await db.update(auditRuns).set({ status: "failed", error: message.slice(0, 500), finishedAt: new Date(), stepLockUntil: null }).where(eq(auditRuns.id, runId));
    throw e;
  }
}

export async function cancelAudit(db: Db, runId: string) {
  const [row] = await db
    .update(auditRuns)
    .set({ status: "cancelled", finishedAt: new Date(), stepLockUntil: null })
    .where(and(eq(auditRuns.id, runId), eq(auditRuns.status, "running")))
    .returning({ id: auditRuns.id });
  return !!row;
}

export async function loadRunEvidence(db: Db, runId: string) {
  const [run] = await db.select().from(auditRuns).where(eq(auditRuns.id, runId));
  if (!run) throw new AuditStateError("Audit not found");
  const pages = (await db.select({ data: auditPages.data }).from(auditPages).where(eq(auditPages.runId, runId))).map((r) => r.data as FetchedPage);
  const assets: AssetCheck[] = (await db.select().from(auditAssets).where(eq(auditAssets.runId, runId))).map((a) => ({ url: a.url, status: a.status, error: a.error, finalUrl: null }));
  return { run, state: run.state as CrawlState, pages, assets };
}

/** Evaluates the finished crawl and merges findings into the persistent issue list. */
export async function finalise(db: Db, runId: string) {
  const { run, state, pages, assets } = await loadRunEvidence(db, runId);
  const detected = evaluate({ state, pages, assets, thresholds: run.thresholds as Partial<AuditThresholds> });
  const now = new Date();
  await mergeIssues(db, detected, runId, now);
  const counts = countBySeverity(detected);
  await db
    .update(auditRuns)
    .set({
      status: "completed",
      finishedAt: now,
      issueCounts: counts,
      summary: {
        pages: pages.length,
        pagesOk: pages.filter((p) => p.status === 200).length,
        assetsChecked: assets.length,
        skipped: state.skipped,
        limitReached: state.limitReached,
        robots: state.robots ? { status: state.robots.status, error: state.robots.error } : null,
        sitemaps: state.sitemaps,
        sitemapEntries: state.sitemapEntries.length,
        issues: detected.length,
        affectedUrls: new Set(detected.map((d) => d.url)).size,
      },
    })
    .where(eq(auditRuns.id, runId));
}

async function mergeIssues(db: Db, detected: DetectedIssue[], runId: string, now: Date) {
  const fps = detected.map((d) => d.fingerprint);
  const existing = fps.length ? await db.select({ id: issues.id, fingerprint: issues.fingerprint, status: issues.status }).from(issues).where(inArray(issues.fingerprint, fps)) : [];
  const byFp = new Map(existing.map((e) => [e.fingerprint, e]));
  const events: (typeof issueEvents.$inferInsert)[] = [];

  await insertChunks(detected, 100, async (chunk) => {
    const rows = await db
      .insert(issues)
      .values(
        chunk.map((d) => ({
          fingerprint: d.fingerprint,
          type: d.type,
          severity: d.severity,
          url: d.url,
          title: d.title,
          explanation: d.explanation,
          fix: d.fix,
          evidence: d.evidence,
          status: "open",
          detectedInLatestRun: true,
          firstSeenRunId: runId,
          lastSeenRunId: runId,
          firstDetectedAt: now,
          lastDetectedAt: now,
          lastCheckedAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: issues.fingerprint,
        set: {
          severity: sql`excluded.severity`,
          title: sql`excluded.title`,
          explanation: sql`excluded.explanation`,
          fix: sql`excluded.fix`,
          evidence: sql`excluded.evidence`,
          detectedInLatestRun: true,
          lastSeenRunId: runId,
          lastDetectedAt: now,
          lastCheckedAt: now,
          // a "fixed" issue found again is a regression → reopen it; ignored stays ignored
          status: sql`CASE WHEN ${issues.status} = 'fixed' THEN 'open' ELSE ${issues.status} END`,
          resolvedAt: sql`CASE WHEN ${issues.status} = 'fixed' THEN NULL ELSE ${issues.resolvedAt} END`,
          resolvedBy: sql`CASE WHEN ${issues.status} = 'fixed' THEN NULL ELSE ${issues.resolvedBy} END`,
          resolution: sql`CASE WHEN ${issues.status} = 'fixed' THEN NULL ELSE ${issues.resolution} END`,
          updatedAt: now,
        },
      })
      .returning({ id: issues.id, fingerprint: issues.fingerprint });
    for (const r of rows) {
      const prev = byFp.get(r.fingerprint);
      if (!prev) events.push({ issueId: r.id, actor: "audit", action: "detected", toStatus: "open", note: `Audit ${runId}` });
      else if (prev.status === "fixed") events.push({ issueId: r.id, actor: "audit", action: "redetected", fromStatus: "fixed", toStatus: "open", note: `Found again in audit ${runId}` });
    }
  });

  // Open issues not found this time are flagged for confirmation — never auto-closed.
  const gone = await db
    .update(issues)
    .set({ detectedInLatestRun: false, lastCheckedAt: now, updatedAt: now })
    .where(and(inArray(issues.status, ["open", "assigned"]), eq(issues.detectedInLatestRun, true), fps.length ? sql`${issues.fingerprint} NOT IN (${sql.join(fps.map((f) => sql`${f}`), sql`, `)})` : sql`true`))
    .returning({ id: issues.id });
  for (const g of gone) events.push({ issueId: g.id, actor: "audit", action: "not_detected", note: `Not found in audit ${runId}; confirm the fix or recheck` });
  await insertChunks(events, 200, (chunk) => db.insert(issueEvents).values(chunk));
}

export const ISSUE_STATUSES = ["open", "assigned", "fixed", "ignored"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export async function setIssueStatus(db: Db, issueId: string, to: IssueStatus, actor: string, note: string | null) {
  const [cur] = await db.select().from(issues).where(eq(issues.id, issueId));
  if (!cur) throw new AuditStateError("Issue not found");
  if (cur.status === to) return cur;
  const now = new Date();
  const resolved = to === "fixed" || to === "ignored";
  const [row] = await db
    .update(issues)
    .set({
      status: to,
      resolvedAt: resolved ? now : null,
      resolvedBy: resolved ? actor : null,
      resolution: to === "fixed" ? "user_confirmed" : to === "ignored" ? "ignored" : null,
      updatedAt: now,
    })
    .where(eq(issues.id, issueId))
    .returning();
  await db.insert(issueEvents).values({ issueId, actor, action: "status", fromStatus: cur.status, toStatus: to, note: note?.slice(0, 1000) ?? null });
  return row;
}

const SITE_LEVEL = new Set(["robots_missing", "robots_error", "sitemap_missing", "sitemap_error"]);

/**
 * Re-checks one issue against the live site: re-fetches the affected URL (and
 * the link/asset target named in its evidence), re-evaluates with the latest
 * completed audit as context, and closes the issue only if it is gone.
 */
export async function recheckIssue(db: Db, issueId: string, actor: string, deps: CrawlDeps) {
  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId));
  if (!issue) throw new AuditStateError("Issue not found");
  const [latest] = await db.select({ id: auditRuns.id }).from(auditRuns).where(eq(auditRuns.status, "completed")).orderBy(desc(auditRuns.finishedAt)).limit(1);
  if (!latest) throw new AuditStateError("Run a full audit before rechecking issues");
  const { run, state, pages, assets } = await loadRunEvidence(db, latest.id);
  let ctxState = state;
  let ctxPages = pages;
  let ctxAssets = assets;
  if (SITE_LEVEL.has(issue.type)) {
    ctxState = (await crawlStep(initialState(new URL(state.site)), deps, run.limits as Partial<CrawlLimits>, 0)).state;
  } else {
    const fresh = await fetchSinglePage(issue.url, state, deps, run.limits as Partial<CrawlLimits>);
    ctxPages = [...pages.filter((p) => p.url !== issue.url), fresh];
    const ev = issue.evidence as { target?: string; asset?: string; canonical?: string };
    for (const t of [ev.target, ev.canonical].filter((x): x is string => typeof x === "string")) {
      const p = await fetchSinglePage(t, state, deps, run.limits as Partial<CrawlLimits>);
      ctxPages = [...ctxPages.filter((x) => x.url !== t), p];
    }
    if (typeof ev.asset === "string") {
      const a = await checkSingleAsset(ev.asset, new URL(state.site), deps, run.limits as Partial<CrawlLimits>);
      ctxAssets = [...assets.filter((x) => x.url !== a.url), a];
    }
  }
  const found = evaluate({ state: ctxState, pages: ctxPages, assets: ctxAssets, thresholds: run.thresholds as Partial<AuditThresholds> }).find((d) => d.fingerprint === issue.fingerprint);
  const now = new Date();
  if (found) {
    await db.update(issues).set({ evidence: found.evidence, explanation: found.explanation, detectedInLatestRun: true, lastCheckedAt: now, lastDetectedAt: now, updatedAt: now }).where(eq(issues.id, issueId));
    await db.insert(issueEvents).values({ issueId, actor, action: "recheck", note: "Still present on the live site" });
    return { stillPresent: true };
  }
  await db
    .update(issues)
    .set({ status: "fixed", resolution: "verified_recheck", resolvedAt: now, resolvedBy: actor, detectedInLatestRun: false, lastCheckedAt: now, updatedAt: now })
    .where(eq(issues.id, issueId));
  await db.insert(issueEvents).values({ issueId, actor, action: "recheck", fromStatus: issue.status, toStatus: "fixed", note: "No longer detected on the live site (verified recheck)" });
  return { stillPresent: false };
}
