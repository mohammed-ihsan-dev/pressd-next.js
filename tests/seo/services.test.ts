// Service tests against a real (in-memory) Postgres via PGlite and a fake website.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { openPglite, type Db } from "../../lib/seo/db/client.ts";
import { auditRuns, issues, issueEvents } from "../../lib/seo/db/schema.ts";
import { startAudit, stepAudit, cancelAudit, setIssueStatus, recheckIssue, AuditBusyError } from "../../lib/seo/services/audits.ts";
import type { CrawlDeps, FetchFn } from "../../lib/seo/core/crawler.ts";
import { parseSiteUrl } from "../../lib/seo/core/url.ts";

const site = parseSiteUrl("https://www.pressdcafe.ae");
let routes: Record<string, { status: number; body?: string; headers?: Record<string, string> }> = {};
const fetchFake: FetchFn = async (url, init) => {
  const u = new URL(url);
  const r = routes[u.pathname] ?? { status: 404 };
  return { status: r.status, headers: new Headers({ "content-type": "text/html", ...(r.headers ?? {}) }), body: null, text: async () => (init.method === "HEAD" ? "" : (r.body ?? "")) };
};
let clock = Date.now();
const deps: CrawlDeps = { fetch: fetchFake, lookup: async () => [{ address: "76.76.21.21", family: 4 }], now: () => (clock += 10), userAgent: "PRESSD-SEO-Audit test", sleep: async () => {} };

const home = (extra = "") =>
  `<html lang="en"><head><title>PRESS'D Wellness Café at Meydan Polo Residence</title><meta name="viewport" content="width=device-width"><link rel="canonical" href="https://www.pressdcafe.ae/"></head><body><h1>PRESS'D</h1><img src="/assets/a.webp">${extra}</body></html>`;

async function runToEnd(db: Db, id: string) {
  for (let i = 0; i < 50; i++) {
    const r = await stepAudit(db, id, deps, 10_000);
    if (r.done) return r;
  }
  throw new Error("audit did not finish");
}

describe("audit service (PGlite)", () => {
  let db: Db;
  before(async () => {
    db = await openPglite(null);
  });

  test("only one audit can run at a time", async () => {
    routes = { "/": { status: 200, body: home() } };
    const id = await startAudit(db, { site, actor: "a@x.com" });
    await assert.rejects(startAudit(db, { site, actor: "b@x.com" }), (e) => e instanceof AuditBusyError && e.runId === id);
    assert.equal(await cancelAudit(db, id), true);
    const [row] = await db.select().from(auditRuns).where(eq(auditRuns.id, id));
    assert.equal(row.status, "cancelled");
  });

  test("a concurrent step on the same run is refused instead of double-processing", async () => {
    routes = { "/": { status: 200, body: home() } };
    const id = await startAudit(db, { site, actor: "a@x.com" });
    await db.update(auditRuns).set({ stepLockUntil: new Date(Date.now() + 60_000) }).where(eq(auditRuns.id, id));
    const r = await stepAudit(db, id, deps);
    assert.equal(r.busy, true);
    assert.equal(r.pagesCrawled, 0);
    await cancelAudit(db, id);
  });

  test("findings come from the crawled HTML, persist across runs and are never auto-closed", async () => {
    routes = { "/": { status: 200, body: home() } };
    const id1 = await startAudit(db, { site, actor: "a@x.com" });
    const done = await runToEnd(db, id1);
    assert.equal(done.status, "completed");
    const [run] = await db.select().from(auditRuns).where(eq(auditRuns.id, id1));
    assert.equal((run.summary as { pages: number }).pages, 1);
    const all = await db.select().from(issues);
    const types = all.map((i) => i.type).sort();
    for (const t of ["description_missing", "img_alt_missing", "robots_missing", "sitemap_missing", "social_meta_missing"]) assert.ok(types.includes(t), t);
    assert.ok(!types.includes("title_missing") && !types.includes("canonical_missing") && !types.includes("h1_missing"));
    const alt = all.find((i) => i.type === "img_alt_missing")!;
    assert.deepEqual((alt.evidence as { examples: string[] }).examples, ["/assets/a.webp"]);

    // site fixed: alt text added → second audit flags it as not detected, but it stays open
    routes = { "/": { status: 200, body: home().replace('<img src="/assets/a.webp">', '<img src="/assets/a.webp" alt="Latte">') } };
    const id2 = await startAudit(db, { site, actor: "a@x.com" });
    await runToEnd(db, id2);
    const [altAfter] = await db.select().from(issues).where(eq(issues.id, alt.id));
    assert.equal(altAfter.status, "open");
    assert.equal(altAfter.detectedInLatestRun, false);

    // a verified recheck closes it
    const res = await recheckIssue(db, alt.id, "a@x.com", deps);
    assert.equal(res.stillPresent, false);
    const [closed] = await db.select().from(issues).where(eq(issues.id, alt.id));
    assert.equal(closed.status, "fixed");
    assert.equal(closed.resolution, "verified_recheck");

    // regression: the problem returns → the issue reopens with a history event
    routes = { "/": { status: 200, body: home() } };
    const id3 = await startAudit(db, { site, actor: "a@x.com" });
    await runToEnd(db, id3);
    const [reopened] = await db.select().from(issues).where(eq(issues.id, alt.id));
    assert.equal(reopened.status, "open");
    const events = await db.select().from(issueEvents).where(eq(issueEvents.issueId, alt.id));
    assert.deepEqual(events.map((e) => e.action), ["detected", "not_detected", "recheck", "redetected"]);
  });

  test("recheck keeps an issue open while it is still present", async () => {
    const [desc] = await db.select().from(issues).where(eq(issues.type, "description_missing"));
    const r = await recheckIssue(db, desc.id, "a@x.com", deps);
    assert.equal(r.stillPresent, true);
    const [row] = await db.select().from(issues).where(eq(issues.id, desc.id));
    assert.equal(row.status, "open");
  });

  test("ignored issues stay ignored when detected again; manual status changes are logged", async () => {
    const [social] = await db.select().from(issues).where(eq(issues.type, "social_meta_missing"));
    await setIssueStatus(db, social.id, "ignored", "a@x.com", "Not needed yet");
    const id = await startAudit(db, { site, actor: "a@x.com" });
    await runToEnd(db, id);
    const [row] = await db.select().from(issues).where(eq(issues.id, social.id));
    assert.equal(row.status, "ignored");
    const ev = await db.select().from(issueEvents).where(eq(issueEvents.issueId, social.id));
    assert.ok(ev.some((e) => e.action === "status" && e.toStatus === "ignored" && e.note === "Not needed yet" && e.actor === "a@x.com"));
  });
});
