import type { Metadata } from "next";
import DbMissing from "@/components/seo/DbMissing";
import PageHead from "@/components/seo/PageHead";
import PerformanceRunner from "@/components/seo/PerformanceRunner";
import { requirePage } from "@/lib/seo/auth/guard";
import type { FieldMetric, PsiResult } from "@/lib/seo/core/pagespeed";
import { can } from "@/lib/seo/core/permissions";
import { pageSpeedKey, siteUrl } from "@/lib/seo/env";
import { dbOrNull, latestCompletedRun, runPages } from "@/lib/seo/page-data";
import { history } from "@/lib/seo/services/performance";

export const metadata: Metadata = { title: "Performance" };

const fmt = (d: Date) => d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" }) + " GST";
const ms = (v: number | null) => (v === null ? "not returned" : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`);
const scoreClass = (s: number | null) => (s === null ? "" : s >= 90 ? "delta-up" : s < 50 ? "delta-down" : "");

function Field({ label, m, unit }: { label: string; m: FieldMetric | null; unit: "ms" | "cls" }) {
  return (
    <div className="stat">
      <dt>{label} (p75)</dt>
      <dd className="num">
        {m ? (unit === "cls" ? m.p75.toFixed(2) : ms(m.p75)) : "—"}
        <small>{m ? `Google rating: ${m.category ?? "n/a"}` : "not available"}</small>
      </dd>
    </div>
  );
}

export default async function PerformancePage() {
  const viewer = await requirePage("reports:read");
  const db = await dbOrNull();
  if (!db) return (<><PageHead eyebrow="SEO Studio" title="Performance" /><DbMissing /></>);
  const site = siteUrl();
  const runs = await history(db, 80);
  const last = await latestCompletedRun(db);
  const crawled = last ? (await runPages(db, last.id)).filter((p) => p.status === 200).map((p) => p.url) : [];
  const urls = [...new Set([site.toString(), ...crawled])];

  const groups = new Map<string, typeof runs>();
  for (const r of runs) {
    const k = `${r.url}|${r.strategy}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }

  return (
    <>
      <PageHead
        eyebrow="SEO Studio"
        title="Performance"
        lede="Google PageSpeed Insights, run on demand from the server. Lab scores come from one simulated Lighthouse run; Core Web Vitals field data comes from real Chrome users and exists only when Google has enough traffic."
      />
      <section className="section-block">
        <PerformanceRunner urls={urls} canRun={can(viewer.role, "performance:run")} hasKey={!!pageSpeedKey()} />
      </section>

      {!runs.length ? <div className="empty">No tests yet. Run a mobile and a desktop test for the home page.</div> : null}

      {[...groups.entries()].map(([key, list]) => {
        const [url, strategy] = key.split("|");
        const latest = list.find((r) => r.status === "completed");
        const prev = list.filter((r) => r.status === "completed")[1];
        const res = latest?.result as PsiResult | undefined;
        const prevRes = prev?.result as PsiResult | undefined;
        const failed = list[0].status === "failed" ? list[0] : null;
        return (
          <section className="section-block" key={key} aria-label={`${strategy} results for ${url}`}>
            <h2 className="section">{strategy} · <span className="wrap-anywhere" style={{ textTransform: "none" }}>{new URL(url).pathname}</span></h2>
            {failed ? <div className="notice notice-error" role="status"><p>Latest attempt failed ({fmt(failed.createdAt)}): {failed.error}</p></div> : null}
            {res && latest ? (
              <>
                <p className="small muted">Lighthouse {res.lighthouseVersion ?? ""} · analysed {res.analysisAt ? fmt(new Date(res.analysisAt)) : fmt(latest.createdAt)} · requested by {latest.requestedBy}{prev ? ` · compared with ${fmt(prev.createdAt)}` : ""}</p>
                <h3 className="small muted" style={{ letterSpacing: ".1em", textTransform: "uppercase", margin: "14px 0 8px" }}>Lab data — Lighthouse scores</h3>
                <dl className="stats">
                  {(["performance", "accessibility", "best-practices", "seo"] as const).map((c) => {
                    const v = res.scores[c];
                    const pv = prevRes?.scores[c] ?? null;
                    return (
                      <div className="stat" key={c}>
                        <dt>{c === "seo" ? "Lighthouse SEO" : c.replace("-", " ")}</dt>
                        <dd className={`num ${scoreClass(v)}`}>{v ?? "—"}{v !== null && pv !== null && v !== pv ? <small className={v > pv ? "delta-up" : "delta-down"}>{v > pv ? "+" : ""}{v - pv} vs previous</small> : <small>{v === null ? "not returned" : "/ 100"}</small>}</dd>
                      </div>
                    );
                  })}
                </dl>
                <dl className="stats" style={{ marginTop: -1 }}>
                  <div className="stat"><dt>LCP (lab)</dt><dd className="num">{ms(res.lab.lcpMs)}</dd></div>
                  <div className="stat"><dt>CLS (lab)</dt><dd className="num">{res.lab.cls === null ? "—" : res.lab.cls.toFixed(3)}</dd></div>
                  <div className="stat"><dt>Total blocking time</dt><dd className="num">{ms(res.lab.tbtMs)}</dd></div>
                  <div className="stat"><dt>First contentful paint</dt><dd className="num">{ms(res.lab.fcpMs)}</dd></div>
                </dl>
                <h3 className="small muted" style={{ letterSpacing: ".1em", textTransform: "uppercase", margin: "18px 0 8px" }}>Field data — real users (Chrome UX Report, last 28 days)</h3>
                {res.field ? (
                  <>
                    <p className="small faint">{res.field.source === "url" ? "Data for this exact URL." : "Not enough traffic for this URL — these are origin-wide figures for the whole site."} Overall: {res.field.overall ?? "n/a"}.</p>
                    <dl className="stats">
                      <Field label="LCP" m={res.field.lcp} unit="ms" />
                      <Field label="INP" m={res.field.inp} unit="ms" />
                      <Field label="CLS" m={res.field.cls} unit="cls" />
                      <Field label="TTFB" m={res.field.ttfb} unit="ms" />
                    </dl>
                  </>
                ) : <div className="empty">Google returned no real-user field data for this URL or origin (not enough Chrome traffic). Only lab data is available.</div>}
                <div className="grid-2" style={{ marginTop: 20 }}>
                  <div>
                    <h3 className="section" style={{ fontSize: 12 }}>Opportunities</h3>
                    {res.opportunities.length ? <ul className="small" style={{ paddingLeft: 18 }}>{res.opportunities.map((o) => <li key={o.id}>{o.title}{o.displayValue ? <span className="faint"> — {o.displayValue}</span> : null}</li>)}</ul> : <p className="small faint">None flagged.</p>}
                    <h3 className="section" style={{ fontSize: 12, marginTop: 16 }}>Diagnostics</h3>
                    {res.diagnostics.length ? <ul className="small" style={{ paddingLeft: 18 }}>{res.diagnostics.map((o) => <li key={o.id}>{o.title}{o.displayValue ? <span className="faint"> — {o.displayValue}</span> : null}</li>)}</ul> : <p className="small faint">None flagged.</p>}
                  </div>
                  <div>
                    {Object.entries(res.failing).map(([cat, items]) => (
                      <div key={cat} style={{ marginBottom: 14 }}>
                        <h3 className="section" style={{ fontSize: 12 }}>Failed {cat === "seo" ? "Lighthouse SEO" : cat} checks</h3>
                        {items.length ? <ul className="small" style={{ paddingLeft: 18 }}>{items.map((i) => <li key={i.id}>{i.title}</li>)}</ul> : <p className="small faint">None.</p>}
                      </div>
                    ))}
                  </div>
                </div>
                {res.warnings.length ? <p className="small faint">Lighthouse warnings: {res.warnings.join(" · ")}</p> : null}
                {list.filter((r) => r.status === "completed").length > 1 ? (
                  <details className="disclose" style={{ marginTop: 12 }}>
                    <summary>History ({list.length} runs)</summary>
                    <table className="data" style={{ marginTop: 8 }}><thead><tr><th scope="col">Run</th><th scope="col" className="right">Perf</th><th scope="col" className="right">LCP (lab)</th><th scope="col" className="right">CLS (lab)</th></tr></thead>
                      <tbody>{list.map((r) => { const x = r.result as PsiResult | null; return <tr key={r.id}><td>{fmt(r.createdAt)}</td><td className="right num">{x?.scores.performance ?? (r.status === "failed" ? "failed" : "—")}</td><td className="right num">{x ? ms(x.lab.lcpMs) : "—"}</td><td className="right num">{x?.lab.cls?.toFixed(3) ?? "—"}</td></tr>; })}</tbody></table>
                  </details>
                ) : null}
              </>
            ) : null}
          </section>
        );
      })}
    </>
  );
}
