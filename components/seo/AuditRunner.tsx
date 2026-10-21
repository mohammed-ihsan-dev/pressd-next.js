"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./client";
import CsvLink from "./CsvLink";

interface Step {
  status: string;
  phase: string;
  pagesCrawled: number;
  queued: number;
  done: boolean;
  busy?: boolean;
}

/** Starts an audit and drives its bounded steps until done. */
export default function AuditRunner({ canRun, runningId, maxPages }: { canRun: boolean; runningId: string | null; maxPages: number }) {
  const router = useRouter();
  const [runId, setRunId] = useState<string | null>(runningId);
  const [step, setStep] = useState<Step | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(!!runningId && canRun);
  const stop = useRef(false);

  // Callers set `working` before calling, so the effect below never sets state synchronously.
  async function drive(id: string) {
    stop.current = false;
    for (let i = 0; i < 500 && !stop.current; i++) {
      const r = await api<Step>("POST", `/api/admin/seo/audits/${id}/step`);
      if (!r.ok || !r.data) {
        setError(r.error ?? "The audit step failed.");
        break;
      }
      setStep(r.data);
      if (r.data.done) break;
      if (r.data.busy) await new Promise((ok) => setTimeout(ok, 3000)); // another tab is driving this step
    }
    setWorking(false);
    router.refresh();
  }

  useEffect(() => {
    // resume an audit that was already running when the page loaded
    // (started from a promise callback: `drive` updates state as steps finish)
    if (runningId && canRun) void Promise.resolve(runningId).then(drive);
    return () => {
      stop.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setError(null);
    const r = await api<{ runId: string }>("POST", "/api/admin/seo/audits");
    if (r.status === 409) {
      const existing = (r.data as { error?: { runId?: string } } | null)?.error?.runId;
      setError("An audit is already running." + (existing ? " Continuing it." : ""));
      if (existing) {
        setRunId(existing);
        setWorking(true);
        void drive(existing);
      }
      return;
    }
    if (!r.ok || !r.data) return setError(r.error);
    setRunId(r.data.runId);
    setStep(null);
    setWorking(true);
    void drive(r.data.runId);
  }

  async function cancel() {
    if (!runId) return;
    stop.current = true;
    const r = await api("POST", `/api/admin/seo/audits/${runId}/cancel`);
    if (!r.ok) setError(r.error);
    setWorking(false);
    router.refresh();
  }

  const pct = step ? Math.min(100, Math.round((step.pagesCrawled / Math.max(1, Math.min(maxPages, step.pagesCrawled + step.queued))) * 100)) : 0;
  const phaseLabel: Record<string, string> = { discover: "Reading robots.txt and sitemaps", crawl: "Crawling pages", assets: "Checking images and files", done: "Finished" };

  return (
    <div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={start} disabled={!canRun || working} aria-describedby={!canRun ? "audit-perm" : undefined}>
          {working ? "Audit running…" : "Run technical audit"}
        </button>
        {working ? <button className="btn btn-danger" onClick={cancel}>Cancel</button> : null}
        <CsvLink kind="issues">Export issues (CSV)</CsvLink>
        <CsvLink kind="pages">Export page inventory (CSV)</CsvLink>
      </div>
      {!canRun ? <p id="audit-perm" className="hint">Your role can view audits but not start them.</p> : null}
      {working || step ? (
        <div style={{ maxWidth: 520 }} aria-live="polite">
          <p className="status-line">
            {step ? `${phaseLabel[step.phase] ?? step.phase} · ${step.pagesCrawled} URL(s) crawled${step.queued ? ` · ${step.queued} queued` : ""}` : "Starting…"}
            {step?.done ? ` · ${step.status}` : ""}
          </p>
          {working ? <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Audit progress"><i style={{ width: `${Math.max(pct, 4)}%` }} /></div> : null}
        </div>
      ) : null}
      {error ? <p className="status-line" role="alert">{error}</p> : null}
    </div>
  );
}
