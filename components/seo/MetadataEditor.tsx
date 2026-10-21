"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, fmtDate } from "./client";
import { ROBOTS_OPTIONS, snippetPreview } from "@/lib/seo/core/metadata";

type Fields = { title: string; description: string; canonical: string; robots: string; ogTitle: string; ogDescription: string; ogImage: string };
export interface ChangeRow { id: number; at: string; actor: string; action: string; version: number; before: Record<string, string>; after: Record<string, string>; verified: boolean | null; verificationNote: string | null }

const EMPTY: Fields = { title: "", description: "", canonical: "", robots: "", ogTitle: "", ogDescription: "", ogImage: "" };

export default function MetadataEditor({ path, siteOrigin, defaults, published, history, canPublish }: {
  path: string;
  siteOrigin: string;
  defaults: { title: string; description: string; ogTitle: string; ogDescription: string };
  published: Partial<Fields>;
  history: ChangeRow[];
  canPublish: boolean;
}) {
  const router = useRouter();
  const fid = `meta-${path.replace(/[^a-z0-9]/gi, "") || "home"}`;
  const initial = useMemo(() => ({ ...EMPTY, ...published }), [published]);
  const [v, setV] = useState<Fields>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean; field?: string } | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const effTitle = v.title || defaults.title;
  const effDesc = v.description || defaults.description;
  const preview = snippetPreview(effTitle, effDesc);
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  async function verify(changeId: number) {
    setVerifyMsg({ text: "Checking the live page…" });
    const r = await api<{ verified: boolean; note: string }>("POST", "/api/admin/seo/metadata/verify", { changeId });
    setVerifyMsg(r.ok ? { text: `Live check: ${r.data!.note}`, error: !r.data!.verified } : { text: r.error ?? "Verification failed", error: true });
    router.refresh();
  }

  async function publish() {
    if (!window.confirm(`Publish this metadata to ${siteOrigin}${path}? It goes live on the next page render.`)) return;
    setSaving(true);
    const fields = Object.fromEntries(Object.entries(v).filter(([, x]) => x.trim()));
    const r = await api<{ change: { id: number; version: number } }>("POST", "/api/admin/seo/metadata", { path, fields });
    setSaving(false);
    if (!r.ok) return setMsg({ text: r.error ?? "Publish failed", error: true, field: (r.data as { error?: { field?: string } } | null)?.error?.field });
    setMsg({ text: `Published as version ${r.data!.change.version}.` });
    router.refresh();
    void verify(r.data!.change.id);
  }

  async function restore(changeId: number, which: "before" | "after") {
    if (!window.confirm(`Restore the metadata from ${which === "before" ? "before" : "after"} this change? This publishes a new version.`)) return;
    const r = await api<{ change: { version: number } }>("POST", "/api/admin/seo/metadata/restore", { changeId, which });
    setMsg(r.ok ? { text: `Restored as version ${r.data!.change.version}.` } : { text: r.error ?? "Restore failed", error: true });
    router.refresh();
  }

  const inv = (f: string) => (msg?.field === f ? { "aria-invalid": true as const } : {});
  const count = (s: string, d: string) => `${(s || d).length} characters${s ? "" : " (default)"}`;

  return (
    <div>
      <div className="grid-2">
        <form className="form-grid" onSubmit={(e) => { e.preventDefault(); void publish(); }} aria-label={`Metadata for ${path}`}>
          <div className="field span-all">
            <label htmlFor={`${fid}-title`}>Title</label>
            <input id={`${fid}-title`} aria-describedby={`${fid}-title-hint`} className="input" {...inv("title")} maxLength={120} placeholder={defaults.title} value={v.title} onChange={set("title")} disabled={!canPublish} />
            <span id={`${fid}-title-hint`} className="hint">{count(v.title, defaults.title)} · leave empty to keep the code default</span>
          </div>
          <div className="field span-all">
            <label htmlFor={`${fid}-desc`}>Meta description</label>
            <textarea id={`${fid}-desc`} aria-describedby={`${fid}-desc-hint`} className="input" {...inv("description")} maxLength={320} placeholder={defaults.description} value={v.description} onChange={set("description")} disabled={!canPublish} />
            <span id={`${fid}-desc-hint`} className="hint">{count(v.description, defaults.description)}</span>
          </div>
          <div className="field span-all">
            <label htmlFor={`${fid}-canonical`}>Canonical URL</label>
            <input id={`${fid}-canonical`} aria-describedby={`${fid}-canonical-hint`} className="input" {...inv("canonical")} placeholder={`${siteOrigin}${path}`} value={v.canonical} onChange={set("canonical")} disabled={!canPublish} />
            <span id={`${fid}-canonical-hint`} className="hint">Default: {siteOrigin}{path}. An override must be a https URL on {new URL(siteOrigin).host}.</span>
          </div>
          <div className="field">
            <label htmlFor={`${fid}-robots`}>Robots</label>
            <select id={`${fid}-robots`} aria-describedby={`${fid}-robots-hint`} className="input" {...inv("robots")} value={v.robots} onChange={set("robots")} disabled={!canPublish}>
              <option value="">Default (index, follow)</option>
              {ROBOTS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <span id={`${fid}-robots-hint`} className="hint" style={v.robots.startsWith("noindex") ? { color: "var(--bad)" } : undefined}>{v.robots.startsWith("noindex") ? "noindex removes this page from Google results." : ""}</span>
          </div>
          <div className="field">
            <label htmlFor={`${fid}-ogimage`}>Social image (og:image)</label>
            <input id={`${fid}-ogimage`} className="input" {...inv("ogImage")} placeholder="/assets/…" value={v.ogImage} onChange={set("ogImage")} disabled={!canPublish} />
          </div>
          <div className="field span-all">
            <label htmlFor={`${fid}-ogtitle`}>Social title (og:title)</label>
            <input id={`${fid}-ogtitle`} className="input" {...inv("ogTitle")} maxLength={120} placeholder={defaults.ogTitle} value={v.ogTitle} onChange={set("ogTitle")} disabled={!canPublish} />
          </div>
          <div className="field span-all">
            <label htmlFor={`${fid}-ogdesc`}>Social description (og:description)</label>
            <textarea id={`${fid}-ogdesc`} className="input" {...inv("ogDescription")} maxLength={320} placeholder={defaults.ogDescription} value={v.ogDescription} onChange={set("ogDescription")} disabled={!canPublish} />
          </div>
          {canPublish ? (
            <div className="span-all toolbar" style={{ margin: 0 }}>
              <button className="btn btn-primary" type="submit" disabled={!dirty || saving}>{saving ? "Publishing…" : "Publish"}</button>
              <button className="btn" type="button" disabled={!dirty} onClick={() => setV(initial)}>Discard changes</button>
              {dirty ? <span className="small" style={{ color: "var(--amber)" }} role="status">Unsaved changes — nothing is live until you publish.</span> : null}
            </div>
          ) : <p className="hint span-all">Your role can view metadata but not publish it (publisher or admin required).</p>}
        </form>
        <div>
          <p className="small muted">Approximate search result preview</p>
          <div className="snippet" aria-label="Search snippet preview">
            <div className="s-url">{new URL(siteOrigin).host}{path === "/" ? "" : path}</div>
            <div className="s-title">{preview.title}</div>
            <div className="s-desc">{preview.description}</div>
          </div>
          <p className="small faint">Google decides what to display and may rewrite titles and snippets; this is only an approximation of typical truncation.</p>
        </div>
      </div>
      {msg ? <p className="status-line" role={msg.error ? "alert" : "status"} style={{ marginTop: 14 }}>{msg.text}</p> : null}
      {verifyMsg ? <p className="status-line" role="status" style={{ color: verifyMsg.error ? "var(--amber)" : "var(--good)" }}>{verifyMsg.text}</p> : null}

      <section className="section-block" style={{ marginTop: 28 }}>
        <h2 className="section">Change history</h2>
        {!history.length ? <div className="empty">No metadata has been published from SEO Studio. The page uses the defaults in lib/siteMetadata.ts.</div> : (
          <div className="table-wrap"><table className="data stack">
            <thead><tr><th scope="col">Version</th><th scope="col">When / who</th><th scope="col">Change</th><th scope="col">Live check</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{history.map((h) => {
              const keys = [...new Set([...Object.keys(h.before ?? {}), ...Object.keys(h.after ?? {})])].filter((k) => (h.before ?? {})[k] !== (h.after ?? {})[k]);
              return (
                <tr key={h.id}>
                  <td data-label="Version" className="num">v{h.version} <span className="tag">{h.action}</span></td>
                  <td data-label="When" className="small">{fmtDate(h.at)}<br />{h.actor}</td>
                  <td data-label="Change" className="small">{keys.length ? keys.map((k) => <div key={k}><b>{k}</b>: <span className="faint">{(h.before ?? {})[k] || "(default)"}</span> → {(h.after ?? {})[k] || "(default)"}</div>) : "no field changes"}</td>
                  <td data-label="Live check" className="small">{h.verified === null ? <span className="faint">not checked</span> : <span className={`tag ${h.verified ? "tag-good" : "tag-amber"}`}>{h.verified ? "confirmed live" : "not confirmed"}</span>}{h.verificationNote ? <div className="faint">{h.verificationNote}</div> : null}</td>
                  <td data-label="Actions">{canPublish ? <div style={{ display: "grid", gap: 6 }}>
                    <button className="btn btn-sm" onClick={() => verify(h.id)}>Check live page</button>
                    <button className="btn btn-sm" onClick={() => restore(h.id, "before")}>Restore previous</button>
                  </div> : null}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
