import type { Metadata } from "next";
import AuditRunner from "@/components/seo/AuditRunner";
import DbMissing from "@/components/seo/DbMissing";
import IssuesTable, { type IssueRow } from "@/components/seo/IssuesTable";
import PageHead from "@/components/seo/PageHead";
import { requirePage } from "@/lib/seo/auth/guard";
import { can } from "@/lib/seo/core/permissions";
import { siteUrl } from "@/lib/seo/env";
import { dbOrNull, issueHistory, latestRuns, listIssues, runningRun } from "@/lib/seo/page-data";
import { expireStaleRuns } from "@/lib/seo/services/audits";
import { getSettings } from "@/lib/seo/services/settings";

export const metadata: Metadata = { title: "Technical audit" };

const fmt = (d: Date | null) => (d ? d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" }) : "—");

interface Summary {
  pages?: number;
  pagesOk?: number;
  assetsChecked?: number;
  skipped?: Record<string, number>;
  limitReached?: string | null;
  robots?: { status: number | null } | null;
  sitemaps?: { url: string; status: number | null; entries: number }[];
  sitemapEntries?: number;
}

export default async function AuditPage() {
  const viewer = await requirePage("reports:read");
  const db = await dbOrNull();
  if (!db) return (<><PageHead eyebrow="SEO Studio" title="Technical audit" /><DbMissing /></>);
  await expireStaleRuns(db);
  const [runs, running, issues, settings] = await Promise.all([latestRuns(db, 10), runningRun(db), listIssues(db), getSettings(db)]);
  const history = await issueHistory(db, issues.map((i) => i.id));
  const rows: IssueRow[] = issues.map((i) => ({
    id: i.id, type: i.type, severity: i.severity, url: i.url, title: i.title, explanation: i.explanation, fix: i.fix, evidence: i.evidence, status: i.status,
    detectedInLatestRun: i.detectedInLatestRun, firstDetectedAt: i.firstDetectedAt.toISOString(), lastDetectedAt: i.lastDetectedAt.toISOString(), lastCheckedAt: i.lastCheckedAt.toISOString(),
    resolution: i.resolution, resolvedBy: i.resolvedBy,
    history: history.filter((h) => h.issueId === i.id).map((h) => ({ at: h.at.toISOString(), actor: h.actor, action: h.action, fromStatus: h.fromStatus, toStatus: h.toStatus, note: h.note })),
  }));
  const last = runs.find((r) => r.status === "completed");
  const s = (last?.summary ?? {}) as Summary;

  return (
    <>
      <PageHead
        eyebrow="SEO Studio"
        title="Technical audit"
        lede={<>Crawls <b>{siteUrl().host}</b> only — from robots.txt, sitemaps and internal links — respecting robots.txt and skipping admin, API, cart and query-string URLs. Up to {settings.crawlLimits.maxPages} pages, {settings.crawlLimits.concurrency} at a time.</>}
      />
      <section className="section-block">
        <AuditRunner canRun={can(viewer.role, "audit:run")} runningId={running?.id ?? null} maxPages={settings.crawlLimits.maxPages} />
      </section>

      {last ? (
        <section className="section-block" aria-labelledby="last-h">
          <h2 className="section" id="last-h">Latest completed audit</h2>
          <dl className="kv">
            <dt>Finished</dt><dd>{fmt(last.finishedAt)} GST · by {last.startedBy}</dd>
            <dt>URLs crawled</dt><dd>{s.pages ?? last.pagesCrawled} ({s.pagesOk ?? "?"} returned 200) · {s.assetsChecked ?? 0} images/files checked</dd>
            <dt>robots.txt</dt><dd>{s.robots?.status === 200 ? "found" : s.robots?.status ? `HTTP ${s.robots.status}` : "not reachable"}</dd>
            <dt>Sitemaps</dt><dd>{s.sitemaps?.length ? s.sitemaps.map((m) => `${m.url} (${m.status ?? "no response"}${m.entries ? `, ${m.entries} URLs` : ""})`).join(" · ") : "none"}</dd>
            <dt>Not crawled</dt><dd>{s.skipped && Object.keys(s.skipped).length ? Object.entries(s.skipped).map(([k, v]) => `${v} ${k.replace(/-/g, " ")}`).join(" · ") : "—"}</dd>
            {s.limitReached ? (<><dt>Limit</dt><dd style={{ color: "var(--amber)" }}>{s.limitReached}</dd></>) : null}
          </dl>
          <p className="small faint" style={{ marginTop: 10 }}>
            Findings reflect the HTML the crawler received. A 200 response or sitemap listing does not mean Google has indexed a URL — use URL Inspection on the Search Console page for that. External links are counted but not checked.
          </p>
        </section>
      ) : null}

      <section className="section-block" aria-labelledby="issues-h">
        <h2 className="section" id="issues-h">Issues</h2>
        <IssuesTable issues={rows} canUpdate={can(viewer.role, "issues:update")} canRecheck={can(viewer.role, "audit:run")} canCreateTask={can(viewer.role, "tasks:write")} />
      </section>

      <section className="section-block" aria-labelledby="runs-h">
        <h2 className="section" id="runs-h">Audit history</h2>
        {!runs.length ? <div className="empty">No audits yet.</div> : (
          <div className="table-wrap">
            <table className="data stack">
              <thead><tr><th scope="col">Started</th><th scope="col">Status</th><th scope="col">By</th><th scope="col" className="right">URLs</th><th scope="col">Issues (C/H/M/L)</th></tr></thead>
              <tbody>
                {runs.map((r) => {
                  const c = r.issueCounts as Record<string, number> | null;
                  return (
                    <tr key={r.id}>
                      <td data-label="Started">{fmt(r.startedAt)}</td>
                      <td data-label="Status"><span className={`tag ${r.status === "completed" ? "tag-good" : r.status === "failed" ? "tag-bad" : r.status === "running" ? "tag-amber" : ""}`}>{r.status}</span>{r.error ? <div className="small faint">{r.error}</div> : null}</td>
                      <td data-label="By" className="small">{r.startedBy}</td>
                      <td data-label="URLs" className="right num">{r.pagesCrawled}</td>
                      <td data-label="Issues" className="num">{c ? `${c.critical}/${c.high}/${c.medium}/${c.low}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
