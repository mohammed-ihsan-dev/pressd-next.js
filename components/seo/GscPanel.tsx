"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, fmtDate } from "./client";
import type { GscReport } from "@/lib/seo/services/gsc-report";

interface Property { siteUrl: string; permissionLevel: string; matchesSite: boolean; usable: boolean }

export function PropertyPicker() {
  const router = useRouter();
  const [props, setProps] = useState<Property[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void api<{ properties: Property[] }>("GET", "/api/admin/seo/search-console/properties").then((r) => (r.ok ? setProps(r.data!.properties) : setError(r.error)));
  }, []);
  async function choose(siteUrl: string) {
    setSaving(true);
    const r = await api("POST", "/api/admin/seo/search-console/properties", { propertyUrl: siteUrl });
    setSaving(false);
    if (!r.ok) return setError(r.error);
    router.refresh();
  }
  if (error) return <p className="status-line" role="alert">{error}</p>;
  if (!props) return <p className="status-line" aria-live="polite">Loading the properties this Google account can access…</p>;
  if (!props.length) return <div className="empty">This Google account has no Search Console properties. Add and verify pressdcafe.ae in Search Console, or connect an account that already has access.</div>;
  return (
    <div className="table-wrap">
      <table className="data stack">
        <thead><tr><th scope="col">Property</th><th scope="col">Your permission</th><th scope="col">Covers this site?</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
        <tbody>
          {props.map((p) => (
            <tr key={p.siteUrl}>
              <td data-label="Property" className="url">{p.siteUrl}</td>
              <td data-label="Permission">{p.permissionLevel}</td>
              <td data-label="Covers site">{p.matchesSite ? <span className="tag tag-good">yes</span> : <span className="tag">no</span>}</td>
              <td data-label="Action">
                <button className="btn btn-sm btn-primary" disabled={!p.usable || saving} onClick={() => choose(p.siteUrl)} title={!p.usable ? (p.matchesSite ? "Unverified users cannot read data" : "Does not cover the PRESS'D site") : undefined}>
                  Use this property
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DisconnectButton() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  async function go() {
    if (!window.confirm("Disconnect Search Console? Stored tokens are deleted and access is revoked at Google.")) return;
    const r = await api<{ revoked: boolean }>("POST", "/api/admin/seo/search-console/disconnect");
    setMsg(r.ok ? (r.data!.revoked ? "Disconnected and revoked at Google." : "Disconnected. Google did not confirm revocation — you can also remove access at myaccount.google.com/permissions.") : r.error);
    router.refresh();
  }
  return (<><button className="btn btn-danger btn-sm" onClick={go}>Disconnect</button>{msg ? <p className="status-line" role="status">{msg}</p> : null}</>);
}

const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);
const pos = (n: number | null) => (n === null ? "—" : n.toFixed(1));
const int = (n: number) => n.toLocaleString("en-GB");

function delta(cur: number | null, prev: number | null, invert = false, format: (n: number) => string = (n) => `${n > 0 ? "+" : ""}${n.toFixed(0)}%`) {
  if (cur === null || prev === null || prev === 0) return null;
  const change = invert ? prev - cur : ((cur - prev) / prev) * 100;
  const good = change > 0;
  return <small className={good ? "delta-up" : change < 0 ? "delta-down" : ""}>{invert ? `${change > 0 ? "▲" : change < 0 ? "▼" : ""} ${Math.abs(change).toFixed(1)} positions` : format(change)} vs previous period</small>;
}

function LineChart({ rows }: { rows: GscReport["byDate"] }) {
  if (rows.length < 2) return <p className="small faint">Not enough daily data to draw a trend.</p>;
  const W = 720, H = 180, P = 28;
  const maxC = Math.max(1, ...rows.map((r) => r.clicks));
  const maxI = Math.max(1, ...rows.map((r) => r.impressions));
  const x = (i: number) => P + (i * (W - 2 * P)) / (rows.length - 1);
  const path = (k: "clicks" | "impressions", max: number) => rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${(H - P - (r[k] / max) * (H - 2 * P)).toFixed(1)}`).join(" ");
  return (
    <figure style={{ margin: 0 }}>
      <div className="legend"><span><i style={{ background: "var(--amber)" }} />Clicks (max {int(maxC)})</span><span><i style={{ background: "var(--muted)" }} />Impressions (max {int(maxI)})</span></div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Daily clicks and impressions from ${rows[0].keys[0]} to ${rows.at(-1)!.keys[0]}`}>
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="rgba(244,238,223,.15)" />
        <path d={path("impressions", maxI)} fill="none" stroke="rgba(244,238,223,.55)" strokeWidth="1.5" />
        <path d={path("clicks", maxC)} fill="none" stroke="#fbb019" strokeWidth="2" />
        <text x={P} y={H - 8}>{rows[0].keys[0]}</text>
        <text x={W - P} y={H - 8} textAnchor="end">{rows.at(-1)!.keys[0]}</text>
      </svg>
      <figcaption className="small faint">Each series is scaled to its own maximum. Full numbers are in the CSV-style tables below.</figcaption>
    </figure>
  );
}

function RowsTable({ title, rows, keyLabel, note }: { title: string; rows: GscReport["queries"]; keyLabel: string; note?: string }) {
  return (
    <section className="section-block">
      <h2 className="section">{title}</h2>
      {note ? <p className="small faint">{note}</p> : null}
      {!rows.length ? <div className="empty">No rows returned by Google for this period.</div> : (
        <div className="table-wrap" style={{ maxHeight: 520, overflowY: "auto" }}>
          <table className="data stack">
            <thead><tr><th scope="col">{keyLabel}</th><th scope="col" className="right">Clicks</th><th scope="col" className="right">Impressions</th><th scope="col" className="right">CTR</th><th scope="col" className="right">Avg. position</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.keys.join("|")}>
                  <td data-label={keyLabel} className="url">{r.keys[0]}</td>
                  <td data-label="Clicks" className="right num">{int(r.clicks)}</td>
                  <td data-label="Impressions" className="right num">{int(r.impressions)}</td>
                  <td data-label="CTR" className="right num">{pct(r.ctr)}</td>
                  <td data-label="Position" className="right num">{pos(r.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function GscReportView({ canInspect }: { canInspect: boolean }) {
  const [days, setDays] = useState(28);
  const [refreshTick, setRefreshTick] = useState(0);
  const [data, setData] = useState<GscReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // set true by the handlers that trigger a load
  useEffect(() => {
    let live = true;
    void api<{ report: GscReport | null }>("GET", `/api/admin/seo/search-console/report?days=${days}${refreshTick ? "&refresh=1" : ""}`).then((r) => {
      if (!live) return;
      setLoading(false);
      setError(r.ok ? null : r.error);
      if (r.ok) setData(r.data!.report);
    });
    return () => {
      live = false;
    };
  }, [days, refreshTick]);
  const reload = (next: { days?: number; refresh?: boolean }) => {
    setLoading(true);
    if (next.days !== undefined) setDays(next.days);
    if (next.refresh) setRefreshTick((n) => n + 1);
  };

  const [inspectUrl, setInspectUrl] = useState("/");
  const [inspection, setInspection] = useState<{ text: string; data?: Record<string, unknown> } | null>(null);
  async function inspect() {
    setInspection({ text: "Asking Google…" });
    const r = await api<{ data: Record<string, unknown>; fetchedAt: string; fromCache: boolean }>("POST", "/api/admin/seo/search-console/inspect", { url: inspectUrl });
    if (!r.ok) return setInspection({ text: r.error ?? "Inspection failed" });
    setInspection({ text: `Google URL Inspection result (${r.data!.fromCache ? "cached" : "fetched"} ${fmtDate(r.data!.fetchedAt)})`, data: r.data!.data });
  }

  const t = data?.totals;
  const p = data?.previousTotals;
  return (
    <div>
      <div className="toolbar">
        <label className="field"><span>Period</span>
          <select className="input" value={days} onChange={(e) => reload({ days: Number(e.target.value) })}>
            <option value={7}>Last 7 days</option><option value={28}>Last 28 days</option><option value={90}>Last 3 months</option>
          </select>
        </label>
        <button className="btn" onClick={() => reload({ refresh: true })} disabled={loading}>Refresh from Google</button>
      </div>
      {loading ? <p className="status-line" aria-live="polite">Loading Search Console data…</p> : null}
      {error ? <div className="notice notice-error" role="alert"><p>{error}</p></div> : null}
      {data && t && p ? (
        <>
          <p className="small muted">
            Source: Google Search Console API · property {data.property} · {data.ranges.current.startDate} → {data.ranges.current.endDate} (Pacific Time; the latest ~3 days are excluded because Google is still processing them) compared with {data.ranges.previous.startDate} → {data.ranges.previous.endDate} · {data.fromCache ? "cached" : "fetched"} {fmtDate(data.fetchedAt)}
          </p>
          {!t.hasData ? <div className="notice"><p>Google returned no search performance rows for this period — the site had no recorded impressions, or the property is new.</p></div> : null}
          <dl className="stats" style={{ marginBottom: 24 }}>
            <div className="stat"><dt>Clicks</dt><dd className="num">{int(t.clicks)}{delta(t.clicks, p.clicks)}</dd></div>
            <div className="stat"><dt>Impressions</dt><dd className="num">{int(t.impressions)}{delta(t.impressions, p.impressions)}</dd></div>
            <div className="stat"><dt>CTR</dt><dd className="num">{pct(t.ctr)}{delta(t.ctr, p.ctr)}</dd></div>
            <div className="stat"><dt>Avg. position</dt><dd className="num">{pos(t.position)}{delta(t.position, p.position, true)}</dd></div>
          </dl>
          <section className="section-block"><h2 className="section">Daily trend</h2><LineChart rows={data.byDate} /></section>
          <div className="grid-2">
            <section className="section-block">
              <h2 className="section">Devices</h2>
              {data.devices.length ? data.devices.map((d) => (
                <div className="bar-row" key={d.keys[0]}><span style={{ textTransform: "capitalize" }}>{d.keys[0].toLowerCase()}</span><span className="bar"><i style={{ width: `${(d.clicks / Math.max(1, t.clicks)) * 100}%` }} /></span><span className="num right">{int(d.clicks)} clicks</span></div>
              )) : <div className="empty">No device rows returned.</div>}
            </section>
            <section className="section-block">
              <h2 className="section">Countries (top 15 by clicks)</h2>
              {data.countries.length ? data.countries.map((c) => (
                <div className="bar-row" key={c.keys[0]}><span>{c.keys[0].toUpperCase()}</span><span className="bar"><i style={{ width: `${(c.clicks / Math.max(1, t.clicks)) * 100}%` }} /></span><span className="num right">{int(c.clicks)}</span></div>
              )) : <div className="empty">No country rows returned.</div>}
            </section>
          </div>
          <RowsTable title="Top queries" keyLabel="Query" rows={data.queries} note={`Showing ${data.queries.length} of ${data.queriesReturned} rows returned. Google omits anonymised (rare) queries, so query rows do not add up to the totals above.`} />
          <RowsTable title="Top landing pages" keyLabel="Page" rows={data.pages} note={`Showing ${data.pages.length} of ${data.pagesReturned} rows returned.`} />
          <section className="section-block">
            <h2 className="section">Declining since the previous period</h2>
            <p className="small faint">Pages and queries with at least 5 clicks before that lost 30% or more of their clicks. Small numbers swing naturally — treat these as prompts to investigate, not conclusions.</p>
            {[...data.decliningPages.map((d) => ({ ...d, kind: "Page" })), ...data.decliningQueries.map((d) => ({ ...d, kind: "Query" }))].length === 0 ? (
              <div className="empty">Nothing meets the decline threshold for this comparison.</div>
            ) : (
              <div className="table-wrap"><table className="data stack">
                <thead><tr><th scope="col">Type</th><th scope="col">Page / query</th><th scope="col" className="right">Clicks now</th><th scope="col" className="right">Before</th><th scope="col" className="right">Change</th></tr></thead>
                <tbody>{[...data.decliningPages.map((d) => ({ ...d, kind: "Page" })), ...data.decliningQueries.map((d) => ({ ...d, kind: "Query" }))].map((d) => (
                  <tr key={d.kind + d.key}><td data-label="Type">{d.kind}</td><td data-label="Key" className="url">{d.key}</td><td data-label="Now" className="right num">{d.clicks}</td><td data-label="Before" className="right num">{d.prevClicks}</td><td data-label="Change" className="right num delta-down">{d.clickChangePct}%</td></tr>
                ))}</tbody>
              </table></div>
            )}
          </section>
          <section className="section-block">
            <h2 className="section">Sitemaps known to Search Console</h2>
            {!data.sitemaps.length ? <div className="empty">No sitemaps are submitted for this property. (SEO Studio does not submit sitemaps; do that in Search Console once one exists.)</div> : (
              <div className="table-wrap"><table className="data stack">
                <thead><tr><th scope="col">Sitemap</th><th scope="col">Last downloaded</th><th scope="col" className="right">Errors</th><th scope="col" className="right">Warnings</th></tr></thead>
                <tbody>{data.sitemaps.map((s) => (
                  <tr key={String(s.path)}><td data-label="Sitemap" className="url">{String(s.path)}</td><td data-label="Downloaded">{s.lastDownloaded ? fmtDate(String(s.lastDownloaded)) : "—"}</td><td data-label="Errors" className="right num">{String(s.errors ?? "0")}</td><td data-label="Warnings" className="right num">{String(s.warnings ?? "0")}</td></tr>
                ))}</tbody>
              </table></div>
            )}
          </section>
        </>
      ) : null}
      {canInspect && data ? (
        <section className="section-block">
          <h2 className="section">URL Inspection (Google index status)</h2>
          <p className="small faint">This is the only place SEO Studio reports whether Google has indexed a URL. Google limits inspections per day, so results are cached for 24 hours.</p>
          <div className="toolbar">
            <label className="field" style={{ flex: "1 1 260px" }}><span>URL on the site</span><input className="input" value={inspectUrl} onChange={(e) => setInspectUrl(e.target.value)} /></label>
            <button className="btn" onClick={inspect}>Inspect</button>
          </div>
          {inspection ? (
            <div aria-live="polite">
              <p className="status-line">{inspection.text}</p>
              {inspection.data ? (() => {
                const idx = (inspection.data.indexStatusResult ?? {}) as Record<string, unknown>;
                return (
                  <dl className="kv">
                    <dt>Verdict</dt><dd>{String(idx.verdict ?? "—")}</dd>
                    <dt>Coverage</dt><dd>{String(idx.coverageState ?? "—")}</dd>
                    <dt>Indexing allowed</dt><dd>{String(idx.indexingState ?? "—")}</dd>
                    <dt>robots.txt</dt><dd>{String(idx.robotsTxtState ?? "—")}</dd>
                    <dt>Last crawl</dt><dd>{idx.lastCrawlTime ? fmtDate(String(idx.lastCrawlTime)) : "—"}</dd>
                    <dt>Google-selected canonical</dt><dd>{String(idx.googleCanonical ?? "—")}</dd>
                    <dt>User-declared canonical</dt><dd>{String(idx.userCanonical ?? "—")}</dd>
                  </dl>
                );
              })() : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
