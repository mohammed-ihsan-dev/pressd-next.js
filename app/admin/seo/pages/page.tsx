import type { Metadata } from "next";
import CsvLink from "@/components/seo/CsvLink";
import DbMissing from "@/components/seo/DbMissing";
import MetadataEditor, { type ChangeRow } from "@/components/seo/MetadataEditor";
import PageHead from "@/components/seo/PageHead";
import { requirePage } from "@/lib/seo/auth/guard";
import { can } from "@/lib/seo/core/permissions";
import { siteUrl } from "@/lib/seo/env";
import { dbOrNull, latestCompletedRun, runPages } from "@/lib/seo/page-data";
import { changeHistory, getOverride, PUBLIC_PAGES } from "@/lib/seo/services/metadata";
import { siteMetadata } from "@/lib/siteMetadata";

export const metadata: Metadata = { title: "Pages & metadata" };

const str = (v: unknown) => (typeof v === "string" ? v : "");

export default async function PagesPage() {
  const viewer = await requirePage("reports:read");
  const db = await dbOrNull();
  if (!db) return (<><PageHead eyebrow="SEO Studio" title="Pages & metadata" /><DbMissing /></>);
  const site = siteUrl();
  const run = await latestCompletedRun(db);
  const pages = run ? await runPages(db, run.id) : [];
  const og = (siteMetadata.openGraph ?? {}) as Record<string, unknown>;
  const defaults = { title: str(siteMetadata.title), description: str(siteMetadata.description), ogTitle: str(og.title), ogDescription: str(og.description) };

  return (
    <>
      <PageHead
        eyebrow="SEO Studio"
        title="Pages & metadata"
        lede="Public routes of the Next.js app and what the latest crawl actually saw in their HTML. Metadata edits are explicit, recorded, reversible and checked against the live page."
        actions={<CsvLink kind="pages">Export inventory (CSV)</CsvLink>}
      />

      <section className="section-block">
        <h2 className="section">Inventory</h2>
        <div className="table-wrap">
          <table className="data stack">
            <thead><tr><th scope="col">URL</th><th scope="col">Type / source</th><th scope="col">Title (rendered)</th><th scope="col">Description (rendered)</th><th scope="col">Canonical</th><th scope="col">Robots</th><th scope="col">H1 / images</th></tr></thead>
            <tbody>
              {PUBLIC_PAGES.map((p) => {
                const url = new URL(p.path, site).toString();
                const c = pages.find((x) => x.url === url);
                const f = c?.facts;
                return (
                  <tr key={p.path}>
                    <td data-label="URL" className="url"><a href={url} target="_blank" rel="noreferrer noopener">{url}</a><div className="small faint">{c ? `HTTP ${c.status}` : "not crawled yet"}</div></td>
                    <td data-label="Type" className="small">{p.type}<div className="faint mono">{p.source}</div></td>
                    <td data-label="Title" className="small">{f ? (f.titles[0] ?? <span style={{ color: "var(--bad)" }}>missing</span>) : "—"}{f?.titles[0] ? <div className="faint">{f.titles[0].length} chars</div> : null}</td>
                    <td data-label="Description" className="small">{f ? (f.metaDescriptions[0] ?? <span style={{ color: "var(--bad)" }}>missing</span>) : "—"}{f?.metaDescriptions[0] ? <div className="faint">{f.metaDescriptions[0].length} chars</div> : null}</td>
                    <td data-label="Canonical" className="small wrap-anywhere">{f ? (f.canonicals[0] ?? <span style={{ color: "var(--amber)" }}>none</span>) : "—"}</td>
                    <td data-label="Robots" className="small">{f ? (f.metaRobots.join(", ") || "index, follow (default)") : "—"}{c?.xRobotsTag ? <div className="faint">X-Robots-Tag: {c.xRobotsTag}</div> : null}</td>
                    <td data-label="H1 / images" className="small num">{f ? `${f.h1s.length} H1 · ${f.images.length - f.images.filter((i) => i.alt === null).length}/${f.images.length} images with alt` : "—"}{f ? <div className="faint">og: {["og:title", "og:description", "og:image"].filter((k) => f.og[k]).join(", ") || "none"}</div> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="notice" style={{ marginTop: 16 }}>
          <h3>How this site&apos;s metadata works</h3>
          <p>{PUBLIC_PAGES[0].note}</p>
          <p>Defaults are in <code>lib/siteMetadata.ts</code>. Values published here are stored in the database and layered on top by <code>generateMetadata</code> in <code>app/(site)/layout.tsx</code>; with nothing published the page renders exactly the defaults. If the database is unreachable the defaults are used.</p>
          {!run ? <p>Run a technical audit to see the rendered values.</p> : <p className="small">Rendered values from the audit finished {run.finishedAt?.toLocaleString("en-GB", { timeZone: "Asia/Dubai" })} GST.</p>}
        </div>
      </section>

      {await Promise.all(
        PUBLIC_PAGES.filter((p) => p.editable).map(async (p) => {
          const o = await getOverride(db, p.path);
          const hist = await changeHistory(db, p.path);
          const rows: ChangeRow[] = hist.map((h) => ({ id: h.id, at: h.at.toISOString(), actor: h.actor, action: h.action, version: h.version, before: (h.before ?? {}) as Record<string, string>, after: (h.after ?? {}) as Record<string, string>, verified: h.verified, verificationNote: h.verificationNote }));
          return (
            <section className="section-block" key={p.path}>
              <h2 className="section">Edit metadata · {p.path}</h2>
              <MetadataEditor path={p.path} siteOrigin={site.origin} defaults={defaults} published={o?.fields ?? {}} history={rows} canPublish={can(viewer.role, "metadata:publish")} />
            </section>
          );
        }),
      )}
    </>
  );
}
