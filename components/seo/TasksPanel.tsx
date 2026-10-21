"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, fmtDate } from "./client";
import CsvLink from "./CsvLink";

export interface TaskRow {
  id: string;
  title: string;
  description: string;
  url: string | null;
  issueId: string | null;
  issueTitle: string | null;
  assignee: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  recommendation: string;
  notes: string;
  verification: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  history: { at: string; actor: string; field: string; fromValue: string | null; toValue: string | null }[];
}

const STATUSES = ["todo", "in_progress", "blocked", "done"];
const PRIORITIES = ["urgent", "high", "normal", "low"];
const VERIF = ["unverified", "verified_fixed", "not_fixed"];
const label = (s: string) => s.replace(/_/g, " ");
const PRANK: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

const blank = { title: "", description: "", url: "", assignee: "", priority: "normal", status: "todo", dueDate: "", recommendation: "", notes: "", verification: "unverified" };

function TaskForm({ initial, onSave, onCancel, saving, error }: { initial: typeof blank; onSave: (v: typeof blank) => void; onCancel: () => void; saving: boolean; error: string | null }) {
  const [v, setV] = useState(initial);
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form className="form-grid" style={{ padding: "16px 0" }} onSubmit={(e) => { e.preventDefault(); onSave(v); }}>
      <label className="field span-all"><span>Title *</span><input className="input" required maxLength={200} value={v.title} onChange={set("title")} /></label>
      <label className="field"><span>Assignee (email)</span><input className="input" type="email" value={v.assignee} onChange={set("assignee")} /></label>
      <label className="field"><span>Priority</span><select className="input" value={v.priority} onChange={set("priority")}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
      <label className="field"><span>Status</span><select className="input" value={v.status} onChange={set("status")}>{STATUSES.map((p) => <option key={p} value={p}>{label(p)}</option>)}</select></label>
      <label className="field"><span>Due date</span><input className="input" type="date" value={v.dueDate} onChange={set("dueDate")} /></label>
      <label className="field"><span>Verification</span><select className="input" value={v.verification} onChange={set("verification")}>{VERIF.map((p) => <option key={p} value={p}>{label(p)}</option>)}</select></label>
      <label className="field span-all"><span>Related URL (on the site)</span><input className="input" value={v.url} onChange={set("url")} placeholder="https://www.pressdcafe.ae/" /></label>
      <label className="field span-all"><span>Description</span><textarea className="input" value={v.description} onChange={set("description")} /></label>
      <label className="field span-all"><span>Recommendation</span><textarea className="input" value={v.recommendation} onChange={set("recommendation")} /></label>
      <label className="field span-all"><span>Implementation notes</span><textarea className="input" value={v.notes} onChange={set("notes")} /></label>
      <div className="span-all toolbar" style={{ margin: 0 }}>
        <button className="btn btn-primary" type="submit" disabled={saving || !dirty}>{saving ? "Saving…" : "Save task"}</button>
        <button className="btn" type="button" onClick={() => { if (!dirty || window.confirm("Discard unsaved changes?")) onCancel(); }}>Cancel</button>
        {dirty ? <span className="small" style={{ color: "var(--amber)" }}>Unsaved changes</span> : null}
        {error ? <span className="status-line" role="alert">{error}</span> : null}
      </div>
    </form>
  );
}

export default function TasksPanel({ tasks, canWrite, today }: { tasks: TaskRow[]; canWrite: boolean; today: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [q, setQ] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sort, setSort] = useState<"due" | "priority" | "updated">("due");
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignees = useMemo(() => [...new Set(tasks.map((t) => t.assignee).filter(Boolean))] as string[], [tasks]);
  const isOverdue = (t: TaskRow) => t.status !== "done" && !!t.dueDate && t.dueDate < today;
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tasks
      .filter((t) => (status === "open" ? t.status !== "done" : !status || t.status === status))
      .filter((t) => !priority || t.priority === priority)
      .filter((t) => !assignee || t.assignee === assignee)
      .filter((t) => !overdueOnly || isOverdue(t))
      .filter((t) => !needle || t.title.toLowerCase().includes(needle) || (t.url ?? "").toLowerCase().includes(needle) || t.description.toLowerCase().includes(needle))
      .sort((a, b) =>
        sort === "priority" ? (PRANK[a.priority] - PRANK[b.priority]) || (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9") :
        sort === "updated" ? b.updatedAt.localeCompare(a.updatedAt) :
        (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || PRANK[a.priority] - PRANK[b.priority]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, status, priority, assignee, q, overdueOnly, sort]);

  async function save(id: string | null, v: typeof blank) {
    setSaving(true);
    setError(null);
    const r = id ? await api("PATCH", `/api/admin/seo/tasks/${id}`, v) : await api("POST", "/api/admin/seo/tasks", v);
    setSaving(false);
    if (!r.ok) return setError(r.error);
    setEditing(null);
    router.refresh();
  }

  async function quickStatus(id: string, to: string) {
    const r = await api("PATCH", `/api/admin/seo/tasks/${id}`, { status: to });
    if (!r.ok) setError(r.error);
    router.refresh();
  }

  return (
    <div>
      <div className="toolbar">
        {canWrite ? <button className="btn btn-primary" onClick={() => { setEditing("new"); setError(null); }} disabled={editing === "new"}>New task</button> : null}
        <CsvLink kind="tasks">Export tasks (CSV)</CsvLink>
      </div>
      {editing === "new" ? <TaskForm initial={blank} onSave={(v) => save(null, v)} onCancel={() => setEditing(null)} saving={saving} error={error} /> : null}
      <div className="toolbar" role="search">
        <label className="field"><span>Status</span><select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="open">Not done</option><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label>
        <label className="field"><span>Priority</span><select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">All</option>{PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label className="field"><span>Assignee</span><select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Anyone</option>{assignees.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label className="field" style={{ flex: "1 1 180px" }}><span>Search</span><input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label className="field"><span>Sort</span><select className="input" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="due">Due date</option><option value="priority">Priority</option><option value="updated">Recently updated</option></select></label>
        <label className="small" style={{ display: "flex", gap: 6, alignItems: "center", minHeight: 38 }}><input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} /> Overdue only</label>
      </div>
      <p className="small muted" aria-live="polite">{rows.length} of {tasks.length} task(s)</p>
      {!rows.length ? <div className="empty">{tasks.length ? "No tasks match these filters." : "No tasks yet. Create one, or use “Create task” on an audit issue."}</div> : (
        <div className="table-wrap">
          <table className="data stack">
            <thead><tr><th scope="col">Task</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Assignee</th><th scope="col">Due</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td data-label="Task">
                    <b>{t.title}</b>
                    {t.url ? <div className="small wrap-anywhere"><a href={t.url} target="_blank" rel="noreferrer noopener">{t.url}</a></div> : null}
                    {t.issueTitle ? <div className="small faint">Linked issue: {t.issueTitle}</div> : null}
                    {t.verification !== "unverified" ? <span className={`tag ${t.verification === "verified_fixed" ? "tag-good" : "tag-bad"}`}>{label(t.verification)}</span> : null}
                    {editing === t.id ? (
                      <TaskForm initial={{ title: t.title, description: t.description, url: t.url ?? "", assignee: t.assignee ?? "", priority: t.priority, status: t.status, dueDate: t.dueDate ?? "", recommendation: t.recommendation, notes: t.notes, verification: t.verification }} onSave={(v) => save(t.id, v)} onCancel={() => setEditing(null)} saving={saving} error={error} />
                    ) : (
                      <details className="disclose">
                        <summary>Details &amp; history</summary>
                        {t.description ? <p className="small">{t.description}</p> : null}
                        {t.recommendation ? <p className="small"><span className="faint">Recommendation: </span>{t.recommendation}</p> : null}
                        {t.notes ? <p className="small"><span className="faint">Notes: </span>{t.notes}</p> : null}
                        <p className="small faint">Created {fmtDate(t.createdAt)} by {t.createdBy} · updated {fmtDate(t.updatedAt)}</p>
                        <ul className="small muted" style={{ paddingLeft: 16 }}>{t.history.map((h, i) => <li key={i}>{fmtDate(h.at)} · {h.actor} · {h.field}{h.toValue ? `: ${h.fromValue ? `${label(h.fromValue)} → ` : ""}${label(h.toValue)}` : ""}</li>)}</ul>
                      </details>
                    )}
                  </td>
                  <td data-label="Priority"><span className={`tag ${t.priority === "urgent" ? "tag-bad" : t.priority === "high" ? "tag-amber" : ""}`}>{t.priority}</span></td>
                  <td data-label="Status">
                    {canWrite ? (
                      <select className="input" aria-label={`Status of ${t.title}`} value={t.status} onChange={(e) => quickStatus(t.id, e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
                    ) : label(t.status)}
                  </td>
                  <td data-label="Assignee" className="small wrap-anywhere">{t.assignee ?? <span className="faint">unassigned</span>}</td>
                  <td data-label="Due" className="num small">{t.dueDate ?? "—"}{isOverdue(t) ? <div style={{ color: "var(--bad)" }}>overdue</div> : null}</td>
                  <td data-label="Actions">{canWrite && editing !== t.id ? <button className="btn btn-sm" onClick={() => { setEditing(t.id); setError(null); }}>Edit</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && !editing ? <p className="status-line" role="alert">{error}</p> : null}
    </div>
  );
}
