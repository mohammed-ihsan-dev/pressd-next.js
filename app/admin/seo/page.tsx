import type { Metadata } from "next";
import Link from "next/link";
import DbMissing from "@/components/seo/DbMissing";
import PageHead from "@/components/seo/PageHead";
import { requirePage } from "@/lib/seo/auth/guard";
import type { PsiResult } from "@/lib/seo/core/pagespeed";
import { SEVERITIES } from "@/lib/seo/core/rules";
import { dbOrNull, issueSummary, latestCompletedRun, latestPerformance, latestRuns, overdueTasks, recentlyResolved, runningRun, taskCounts } from "@/lib/seo/page-data";
import { connectionView } from "@/lib/seo/services/gsc";
import { siteUrl } from "@/lib/seo/env";

export const metadata: Metadata = { title: "Overview" };

const fmt = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" }) + " GST" : "—";

export default async function Overview() {
  await requirePage("reports:read");
  const db = await dbOrNull();
  if (!db) return (<><PageHead eyebrow="SEO Studio" title="Overview" /><DbMissing /></>);

  const [lastRun, running, summary, resolved, tc, overdue, perf, conn, runs] = await Promise.all([
    latestCompletedRun(db),
    runningRun(db),
    issueSummary(db),
    recentlyResolved(db),
    taskCounts(db),
    overdueTasks(db),
    latestPerformance(db),
    connectionView(db),
    latestRuns(db, 10),
  ]);
  const home = siteUrl().toString();
  const latestPerf = (strategy: "mobile" | "desktop") => perf.find((p) => p.strategy === strategy && p.url === home) ?? perf.find((p) => p.strategy === strategy);
  const completedRuns = runs.filter((r) => r.status === "completed" && r.issueCounts).reverse();

  return (
    <>
      <PageHead
        eyebrow="SEO Studio"
        title="Overview"
        lede="Status of pressdcafe.ae from your own audits, PageSpeed tests and (when connected) Google Search Console. Every figure shows where it came from and when."
      />

      <section className="section-block" aria-labelledby="audit-h">
        <h2 className="section" id="audit-h">Technical audit</h2>
        {running ? <div className="notice" role="status"><p>An audit is in progress (started {fmt(running.startedAt)} by {running.startedBy}). <Link href="/admin/seo/audit">Open it</Link>.</p></div> : null}
        {!lastRun ? (
          <div className="empty">
            No audit has been run yet. <Link href="/admin/seo/audit">Run the first technical audit</Link> to crawl the live site.
          </div>
        ) : (
          <>
            <p className="status-line">
              Last completed audit: {fmt(lastRun.finishedAt)} · {(lastRun.summary as { pages?: number })?.pages ?? lastRun.pagesCrawled} URL(s) crawled · started by {lastRun.startedBy}
            </p>
            <dl className="stats">
              {SEVERITIES.map((s) => (
                <div className="stat" key={s}>
                  <dt><span className={`sev sev-${s}`}>{s}</span></dt>
                  <dd className="num">{summary.open[s] ?? 0}<small>open issues</small></dd>
                </div>
              ))}
              <div className="stat">
                <dt>Affected URLs</dt>
                <dd className="num">{summary.affectedUrls}<small>with open issues</small></dd>
              </div>
            </dl>
            {completedRuns.length >= 2 ? (
              <div style={{ marginTop: 18 }}>
                <p className="small muted">Issues found per audit (last {completedRuns.length} completed runs)</p>
                <div className="table-wrap">
                  <table className="data">
                    <thead><tr><th scope="col">Finished</th>{SEVERITIES.map((s) => <th scope="col" key={s} className="right">{s}</th>)}</tr></thead>
                    <tbody>
                      {completedRuns.map((r) => (
                        <tr key={r.id}>
                          <td>{fmt(r.finishedAt)}</td>
                          {SEVERITIES.map((s) => <td key={s} className="right num">{(r.issueCounts as Record<string, number>)[s] ?? 0}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : <p className="small faint" style={{ marginTop: 12 }}>Trends appear after two or more completed audits.</p>}
          </>
        )}
      </section>

      <section className="section-block" aria-labelledby="gsc-h">
        <h2 className="section" id="gsc-h">Google Search Console</h2>
        {conn.state === "connected" ? (
          <p>Connected to <b>{conn.propertyUrl}</b>. <Link href="/admin/seo/search-console">View clicks, impressions, CTR and position →</Link></p>
        ) : (
          <div className="empty">
            Not connected — no search performance data is shown until a Search Console property is connected.{" "}
            <Link href="/admin/seo/search-console">Set up the connection</Link>.
          </div>
        )}
      </section>

      <section className="section-block" aria-labelledby="perf-h">
        <h2 className="section" id="perf-h">Performance (Lighthouse lab scores)</h2>
        {!perf.length ? (
          <div className="empty">No PageSpeed tests saved yet. <Link href="/admin/seo/performance">Run a mobile and desktop test</Link>.</div>
        ) : (
          <dl className="stats">
            {(["mobile", "desktop"] as const).map((s) => {
              const run = latestPerf(s);
              const r = run?.result as PsiResult | undefined;
              return (
                <div className="stat" key={s}>
                  <dt>{s} performance</dt>
                  <dd className="num">
                    {r?.scores.performance ?? "—"}
                    <small>{run ? `${run.url.replace("https://", "")} · ${fmt(run.createdAt)}` : "not measured"}</small>
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
        <p className="small faint">Source: Google PageSpeed Insights (single Lighthouse lab run). Real-user Core Web Vitals are shown on the Performance page when Google has field data.</p>
      </section>

      <div className="grid-2">
        <section className="section-block" aria-labelledby="tasks-h">
          <h2 className="section" id="tasks-h">Tasks</h2>
          <dl className="stats">
            <div className="stat"><dt>Open</dt><dd className="num">{tc.open}</dd></div>
            <div className="stat"><dt>Overdue</dt><dd className="num" style={{ color: tc.overdue ? "var(--bad)" : undefined }}>{tc.overdue}</dd></div>
            <div className="stat"><dt>Done</dt><dd className="num">{tc.done}</dd></div>
          </dl>
          {overdue.length ? (
            <ul className="small" style={{ paddingLeft: 18 }}>
              {overdue.map((t) => <li key={t.id}><Link href="/admin/seo/tasks">{t.title}</Link> <span className="faint">due {t.dueDate}</span></li>)}
            </ul>
          ) : null}
        </section>
        <section className="section-block" aria-labelledby="resolved-h">
          <h2 className="section" id="resolved-h">Recently resolved</h2>
          {!resolved.length ? (
            <div className="empty">No issues have been confirmed fixed yet.</div>
          ) : (
            <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
              {resolved.map((i) => (
                <li key={i.id} style={{ marginBottom: 6 }}>
                  {i.title} <span className="faint wrap-anywhere">{new URL(i.url).pathname}</span>{" "}
                  <span className={`tag ${i.resolution === "verified_recheck" ? "tag-good" : ""}`}>{i.resolution === "verified_recheck" ? "verified by recheck" : "confirmed by user"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
