import "server-only";
// Read-side queries used by the dashboard's server components.

import { and, desc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { DatabaseUnavailableError, getDb, type Db } from "./db/client.ts";
import { auditPages, auditRuns, issueEvents, issues, performanceRuns, tasks } from "./db/schema.ts";
import type { FetchedPage } from "./core/crawler.ts";

/** The database, or null when it is not configured (pages then show a setup notice). */
export async function dbOrNull(): Promise<Db | null> {
  try {
    return await getDb();
  } catch (e) {
    if (e instanceof DatabaseUnavailableError) return null;
    throw e;
  }
}

export async function latestRuns(db: Db, limit = 12) {
  return db.select().from(auditRuns).orderBy(desc(auditRuns.startedAt)).limit(limit);
}

export async function latestCompletedRun(db: Db) {
  const [run] = await db.select().from(auditRuns).where(eq(auditRuns.status, "completed")).orderBy(desc(auditRuns.finishedAt)).limit(1);
  return run ?? null;
}

export async function runningRun(db: Db) {
  const [run] = await db.select().from(auditRuns).where(eq(auditRuns.status, "running")).limit(1);
  return run ?? null;
}

export async function issueSummary(db: Db) {
  const rows = await db
    .select({ severity: issues.severity, status: issues.status, n: sql<number>`count(*)::int`, urls: sql<number>`count(distinct ${issues.url})::int` })
    .from(issues)
    .groupBy(issues.severity, issues.status);
  const open = { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>;
  let openTotal = 0;
  for (const r of rows) if (r.status === "open" || r.status === "assigned") {
    open[r.severity] = (open[r.severity] ?? 0) + r.n;
    openTotal += r.n;
  }
  const [{ affected }] = await db
    .select({ affected: sql<number>`count(distinct ${issues.url})::int` })
    .from(issues)
    .where(inArray(issues.status, ["open", "assigned"]));
  return { open, openTotal, affectedUrls: affected };
}

export async function recentlyResolved(db: Db, limit = 8) {
  return db.select().from(issues).where(eq(issues.status, "fixed")).orderBy(desc(issues.resolvedAt)).limit(limit);
}

export async function listIssues(db: Db, limit = 2000) {
  return db.select().from(issues).orderBy(desc(issues.lastDetectedAt)).limit(limit);
}

export async function issueHistory(db: Db, issueIds: string[]) {
  if (!issueIds.length) return [];
  return db.select().from(issueEvents).where(inArray(issueEvents.issueId, issueIds)).orderBy(desc(issueEvents.at)).limit(3000);
}

export async function runPages(db: Db, runId: string): Promise<FetchedPage[]> {
  return (await db.select({ data: auditPages.data }).from(auditPages).where(eq(auditPages.runId, runId))).map((r) => r.data as FetchedPage);
}

export async function taskCounts(db: Db, today = new Date().toISOString().slice(0, 10)) {
  const [r] = await db
    .select({
      open: sql<number>`count(*) filter (where ${tasks.status} <> 'done')::int`,
      overdue: sql<number>`count(*) filter (where ${tasks.status} <> 'done' and ${tasks.dueDate} < ${today})::int`,
      done: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
    })
    .from(tasks);
  return r;
}

export async function overdueTasks(db: Db, today = new Date().toISOString().slice(0, 10)) {
  return db.select().from(tasks).where(and(ne(tasks.status, "done"), lt(tasks.dueDate, today))).orderBy(tasks.dueDate).limit(8);
}

export async function latestPerformance(db: Db) {
  return db.select().from(performanceRuns).where(eq(performanceRuns.status, "completed")).orderBy(desc(performanceRuns.createdAt)).limit(40);
}
