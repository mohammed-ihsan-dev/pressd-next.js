"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, fmtDate } from "./client";

export interface IssueRow {
  id: string;
  type: string;
  severity: string;
  url: string;
  title: string;
  explanation: string;
  fix: string;
  evidence: unknown;
  status: string;
  detectedInLatestRun: boolean;
  firstDetectedAt: string;
  lastDetectedAt: string;
  lastCheckedAt: string;
  resolution: string | null;
  resolvedBy: string | null;
  history: { at: string; actor: string; action: string; fromStatus: string | null; toStatus: string | null; note: string | null }[];
}

const SEV_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUSES = ["open", "assigned", "fixed", "ignored"];

export default function IssuesTable({ issues, canUpdate, canRecheck, canCreateTask }: { issues: IssueRow[]; canUpdate: boolean; canRecheck: boolean; canCreateTask: boolean }) {
  const router = useRouter();
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("active");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"severity" | "url" | "detected">("severity");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; text: string; error?: boolean } | null>(null);

  const types = useMemo(() => [...new Set(issues.map((i) => i.title))].sort(), [issues]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return issues
      .filter((i) => !severity || i.severity === severity)
      .filter((i) => (status === "active" ? i.status === "open" || i.status === "assigned" : !status || i.status === status))
      .filter((i) => !type || i.title === type)
      .filter((i) => !needle || i.url.toLowerCase().includes(needle) || i.title.toLowerCase().includes(needle))
      .sort((a, b) =>
        sort === "url" ? a.url.localeCompare(b.url) : sort === "detected" ? b.lastDetectedAt.localeCompare(a.lastDetectedAt) : (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9) || a.url.localeCompare(b.url),
      );
  }, [issues, severity, status, type, q, sort]);

  async function changeStatus(id: string, to: string) {
    let note: string | null = null;
    if (to === "ignored") {
      note = window.prompt("Why is this issue being ignored? (saved in the history)") ?? null;
      if (note === null) return;
    }
    if (to === "fixed" && !window.confirm("Mark as fixed without a recheck? Use “Recheck” to verify against the live site instead.")) return;
    setBusy(id);
    const r = await api("PATCH", `/api/admin/seo/issues/${id}`, { status: to, note });
    setBusy(null);
    setMsg({ id, text: r.ok ? `Status changed to ${to}.` : r.error ?? "Failed", error: !r.ok });
    if (r.ok) router.refresh();
  }

  async function recheck(id: string) {
    setBusy(id);
    setMsg({ id, text: "Rechecking the live page…" });
    const r = await api<{ stillPresent: boolean }>("POST", `/api/admin/seo/issues/${id}/recheck`);
    setBusy(null);
    setMsg({ id, text: !r.ok ? r.error ?? "Recheck failed" : r.data!.stillPresent ? "Still present on the live site." : "Not found any more — marked fixed (verified recheck).", error: !r.ok });
    if (r.ok) router.refresh();
  }

  async function createTask(i: IssueRow) {
    setBusy(i.id);
    const r = await api("POST", "/api/admin/seo/tasks", { title: `${i.title}: ${new URL(i.url).pathname}`, url: i.url, issueId: i.id, priority: i.severity === "critical" ? "urgent" : i.severity === "high" ? "high" : "normal", recommendation: i.fix, description: i.explanation });
    setBusy(null);
    setMsg({ id: i.id, text: r.ok ? "Task created and issue marked assigned." : r.error ?? "Failed", error: !r.ok });
    if (r.ok) router.refresh();
  }

  return (
    <div>
      <div className="toolbar" role="search">
        <label className="field"><span>Severity</span>
          <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">All</option>
            {["critical", "high", "medium", "low"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="field"><span>Status</span>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Open + assigned</option>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="field"><span>Issue type</span>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="field" style={{ flex: "1 1 200px" }}><span>Search URL or issue</span>
          <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="/menu, canonical…" />
        </label>
        <label className="field"><span>Sort</span>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="severity">Severity</option>
            <option value="url">URL</option>
            <option value="detected">Last detected</option>
          </select>
        </label>
      </div>
      <p className="small muted" aria-live="polite">{rows.length} of {issues.length} issue(s)</p>
      {!rows.length ? (
        <div className="empty">{issues.length ? "No issues match these filters." : "No issues recorded. Run an audit to check the live site."}</div>
      ) : (
        <div className="table-wrap">
          <table className="data stack">
            <thead>
              <tr><th scope="col">Severity</th><th scope="col">Issue</th><th scope="col">URL</th><th scope="col">Status</th><th scope="col">Detected</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td data-label="Severity"><span className={`sev sev-${i.severity}`}>{i.severity}</span></td>
                  <td data-label="Issue">
                    <b>{i.title}</b>
                    <p className="small muted" style={{ margin: "4px 0" }}>{i.explanation}</p>
                    <p className="small" style={{ margin: "4px 0" }}><span className="faint">Fix: </span>{i.fix}</p>
                    <details className="disclose">
                      <summary>Evidence &amp; history</summary>
                      <pre>{JSON.stringify(i.evidence, null, 2)}</pre>
                      <ul className="small muted" style={{ paddingLeft: 16 }}>
                        {i.history.map((h, k) => (
                          <li key={k}>{fmtDate(h.at)} · {h.actor} · {h.action}{h.toStatus ? ` → ${h.toStatus}` : ""}{h.note ? ` — ${h.note}` : ""}</li>
                        ))}
                      </ul>
                    </details>
                    {msg?.id === i.id ? <p className={`status-line small`} role={msg.error ? "alert" : "status"}>{msg.text}</p> : null}
                  </td>
                  <td data-label="URL" className="url"><a href={i.url} target="_blank" rel="noreferrer noopener">{new URL(i.url).pathname + new URL(i.url).search}</a></td>
                  <td data-label="Status">
                    {canUpdate ? (
                      <select className="input" aria-label={`Status for ${i.title} on ${i.url}`} value={i.status} disabled={busy === i.id} onChange={(e) => changeStatus(i.id, e.target.value)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : <span className="tag">{i.status}</span>}
                    {!i.detectedInLatestRun && (i.status === "open" || i.status === "assigned") ? <p className="small" style={{ color: "var(--amber)", margin: "6px 0 0" }}>Not found in latest audit — recheck to confirm</p> : null}
                    {i.status === "fixed" ? <p className="small faint" style={{ margin: "6px 0 0" }}>{i.resolution === "verified_recheck" ? "Verified by recheck" : "Confirmed by"} {i.resolvedBy}</p> : null}
                  </td>
                  <td data-label="Detected" className="small num">{fmtDate(i.firstDetectedAt, false)}<br /><span className="faint">checked {fmtDate(i.lastCheckedAt)}</span></td>
                  <td data-label="Actions">
                    <div style={{ display: "grid", gap: 6 }}>
                      {canRecheck ? <button className="btn btn-sm" disabled={busy === i.id} onClick={() => recheck(i.id)}>Recheck</button> : null}
                      {canCreateTask && i.status === "open" ? <button className="btn btn-sm" disabled={busy === i.id} onClick={() => createTask(i)}>Create task</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
