"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./client";

export default function PerformanceRunner({ urls, canRun, hasKey }: { urls: string[]; canRun: boolean; hasKey: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState(urls[0] ?? "/");
  const [running, setRunning] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  async function run(strategy: "mobile" | "desktop") {
    setRunning(strategy);
    setMsg({ text: `Running ${strategy} test — PageSpeed Insights usually takes 15–40 seconds…` });
    const r = await api<{ run: { status: string; error: string | null } }>("POST", "/api/admin/seo/performance", { url, strategy });
    setRunning(null);
    if (!r.ok && r.status !== 502) return setMsg({ text: r.error ?? "Failed", error: true });
    const run = r.data?.run;
    setMsg(run?.status === "completed" ? { text: `${strategy} test saved.` } : { text: run?.error ?? r.error ?? "PageSpeed Insights failed", error: true });
    router.refresh();
  }

  return (
    <div>
      <div className="toolbar">
        <label className="field" style={{ flex: "1 1 260px" }}>
          <span>URL (verified site only)</span>
          <input className="input" list="perf-urls" value={url} onChange={(e) => setUrl(e.target.value)} />
          <datalist id="perf-urls">{urls.map((u) => <option key={u} value={u} />)}</datalist>
        </label>
        <button className="btn btn-primary" disabled={!canRun || !!running} onClick={() => run("mobile")}>{running === "mobile" ? "Testing mobile…" : "Run mobile test"}</button>
        <button className="btn" disabled={!canRun || !!running} onClick={() => run("desktop")}>{running === "desktop" ? "Testing desktop…" : "Run desktop test"}</button>
      </div>
      {!canRun ? <p className="hint">Your role can view results but not start tests.</p> : null}
      {!hasKey ? <p className="hint">PAGESPEED_INSIGHTS_API_KEY is not set, so tests use Google&apos;s small shared anonymous quota and may be refused.</p> : null}
      {msg ? <p className="status-line" role={msg.error ? "alert" : "status"}>{msg.text}</p> : null}
    </div>
  );
}
