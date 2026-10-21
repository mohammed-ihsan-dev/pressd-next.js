"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./client";

const T_FIELDS = [
  ["titleMin", "Title min characters"],
  ["titleMax", "Title max characters"],
  ["descriptionMin", "Description min characters"],
  ["descriptionMax", "Description max characters"],
] as const;
const L_FIELDS = [
  ["maxPages", "Max pages per audit"],
  ["maxDepth", "Max link depth"],
  ["concurrency", "Parallel requests"],
  ["requestTimeoutMs", "Request timeout (ms)"],
  ["maxAssetChecks", "Max images/files checked"],
] as const;

export default function SettingsForm({ thresholds, limits, canEdit }: { thresholds: Record<string, number>; limits: Record<string, number>; canEdit: boolean }) {
  const router = useRouter();
  const [t, setT] = useState(thresholds);
  const [l, setL] = useState(limits);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const dirty = JSON.stringify(t) !== JSON.stringify(thresholds) || JSON.stringify(l) !== JSON.stringify(limits);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await api("PUT", "/api/admin/seo/settings", { thresholds: t, crawlLimits: Object.fromEntries(L_FIELDS.map(([k]) => [k, l[k]])) });
    setMsg(r.ok ? { text: "Settings saved. They apply to the next audit." } : { text: r.error ?? "Save failed", error: true });
    if (r.ok) router.refresh();
  }

  return (
    <form onSubmit={save}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="section" style={{ marginBottom: 8 }}>Audit guidance thresholds</legend>
        <p className="small faint" style={{ marginTop: 0 }}>Used to flag title/description lengths. These are editorial guidance — Google publishes no fixed limits.</p>
        <div className="form-grid">
          {T_FIELDS.map(([k, label]) => (
            <label className="field" key={k}><span>{label}</span><input className="input" type="number" inputMode="numeric" value={t[k]} onChange={(e) => setT({ ...t, [k]: Number(e.target.value) })} /></label>
          ))}
        </div>
        <h2 className="section" style={{ marginTop: 28 }}>Crawl limits</h2>
        <p className="small faint" style={{ marginTop: 0 }}>Bounded by hard maximums in code (1000 pages, 5 parallel requests, 20 s timeout).</p>
        <div className="form-grid">
          {L_FIELDS.map(([k, label]) => (
            <label className="field" key={k}><span>{label}</span><input className="input" type="number" inputMode="numeric" min={1} value={l[k]} onChange={(e) => setL({ ...l, [k]: Number(e.target.value) })} /></label>
          ))}
        </div>
        {canEdit ? (
          <div className="toolbar" style={{ marginTop: 18 }}>
            <button className="btn btn-primary" type="submit" disabled={!dirty}>Save settings</button>
            {dirty ? <span className="small" style={{ color: "var(--amber)" }}>Unsaved changes</span> : null}
          </div>
        ) : <p className="hint">Only admins can change settings.</p>}
      </fieldset>
      {msg ? <p className="status-line" role={msg.error ? "alert" : "status"}>{msg.text}</p> : null}
    </form>
  );
}
