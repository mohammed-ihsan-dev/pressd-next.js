import { desc, eq } from "drizzle-orm";
import { BadRequest, handle } from "@/lib/seo/api";
import { toCsv } from "@/lib/seo/core/csv";
import type { FetchedPage } from "@/lib/seo/core/crawler";
import { auditPages, auditRuns, issues } from "@/lib/seo/db/schema";
import { getDb } from "@/lib/seo/server";
import { logAdmin } from "@/lib/seo/services/log";
import { listTasks } from "@/lib/seo/services/tasks";

const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export const GET = handle<RouteContext<"/api/admin/seo/export/[kind]">>("reports:export", async (_req, viewer, ctx) => {
  const { kind } = await ctx.params;
  const db = await getDb();
  let csv: string;
  if (kind === "issues") {
    const rows = await db.select().from(issues).limit(20000);
    rows.sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9) || a.url.localeCompare(b.url));
    csv = toCsv(
      ["Severity", "Status", "Category", "Issue", "URL", "Explanation", "Suggested fix", "Evidence", "First detected", "Last detected", "Detected in latest audit", "Resolution", "Resolved by", "Resolved at"],
      rows.map((i) => [i.severity, i.status, i.status === "fixed" ? "Completed fix" : i.status === "ignored" ? "Ignored" : "Confirmed finding (outstanding)", i.title, i.url, i.explanation, i.fix, JSON.stringify(i.evidence), i.firstDetectedAt, i.lastDetectedAt, i.detectedInLatestRun ? "yes" : "no", i.resolution, i.resolvedBy, i.resolvedAt]),
    );
  } else if (kind === "pages") {
    const [run] = await db.select().from(auditRuns).where(eq(auditRuns.status, "completed")).orderBy(desc(auditRuns.finishedAt)).limit(1);
    if (!run) throw new BadRequest("No completed audit yet");
    const pages = (await db.select({ data: auditPages.data }).from(auditPages).where(eq(auditPages.runId, run.id))).map((r) => r.data as FetchedPage);
    csv = toCsv(
      ["URL", "HTTP status", "Final URL", "Redirect hops", "Title", "Title length", "Meta description", "Description length", "Canonical", "Meta robots", "X-Robots-Tag", "H1 count", "First H1", "Images", "Images missing alt", "Internal links", "In sitemap", "Blocked by robots.txt", "Fetched at"],
      pages.map((p) => [p.url, p.status, p.finalUrl, p.redirectChain.length, p.facts?.titles[0], p.facts?.titles[0]?.length, p.facts?.metaDescriptions[0], p.facts?.metaDescriptions[0]?.length, p.facts?.canonicals.join(" | "), p.facts?.metaRobots.join(" | "), p.xRobotsTag, p.facts?.h1s.length, p.facts?.h1s[0], p.facts?.images.length, p.facts?.images.filter((i) => i.alt === null).length, p.outlinks.length, p.inSitemap ? "yes" : "no", p.robotsBlockedRule ?? "", p.fetchedAt]),
    );
  } else if (kind === "tasks") {
    const rows = await listTasks(db, { limit: 500, sort: "due" });
    csv = toCsv(
      ["Title", "Status", "Priority", "Assignee", "Due date", "URL", "Linked issue", "Description", "Recommendation", "Implementation notes", "Verification", "Created by", "Created", "Updated"],
      rows.map((t) => [t.title, t.status, t.priority, t.assignee, t.dueDate, t.url, t.issueId, t.description, t.recommendation, t.notes, t.verification, t.createdBy, t.createdAt, t.updatedAt]),
    );
  } else {
    throw new BadRequest("Unknown export");
  }
  await logAdmin(db, viewer.email, "export", kind);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="pressd-seo-${kind}-${date}.csv"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
});
