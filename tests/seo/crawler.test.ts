import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { crawlStep, initialState, type CrawlState, type FetchFn, type CrawlDeps } from "../../lib/seo/core/crawler.ts";
import { evaluate, countBySeverity } from "../../lib/seo/core/rules.ts";
import { parseSiteUrl } from "../../lib/seo/core/url.ts";

type Route = { status: number; body?: string; headers?: Record<string, string> };

/** A fake website: path → response. Records every request made. */
function fakeSite(routes: Record<string, Route>, base = "https://www.pressdcafe.ae") {
  const requested: string[] = [];
  const fetch: FetchFn = async (url, init) => {
    requested.push(`${init.method} ${url}`);
    const u = new URL(url);
    const key = u.origin === base ? u.pathname + u.search : url;
    const r = routes[key] ?? { status: 404, body: "not found", headers: { "content-type": "text/html" } };
    const headers = new Headers({ "content-type": "text/html; charset=utf-8", ...(r.headers ?? {}) });
    return { status: r.status, headers, body: null, text: async () => (init.method === "HEAD" ? "" : (r.body ?? "")) };
  };
  return { fetch, requested };
}

let clock = 0;
const deps = (fetch: FetchFn, lookup?: CrawlDeps["lookup"]): CrawlDeps => ({
  fetch,
  lookup: lookup ?? (async () => [{ address: "76.76.21.21", family: 4 }]),
  now: () => (clock += 5),
  userAgent: "Mozilla/5.0 (compatible; PRESSD-SEO-Audit/1.0)",
  sleep: async () => {},
});

const page = (title: string, body: string, extraHead = "") =>
  `<html lang="en"><head><title>${title}</title><meta name="description" content="A description that is long enough to fall inside the default guidance range for tests here."><link rel="canonical" href="https://www.pressdcafe.ae${"/"}"><meta name="viewport" content="width=device-width">${extraHead}</head><body>${body}</body></html>`;

async function runAll(state: CrawlState, d: CrawlDeps, limits = {}) {
  const pages = [];
  const assets = [];
  for (let i = 0; i < 100; i++) {
    const r = await crawlStep(state, d, limits, 10_000);
    pages.push(...r.pages);
    assets.push(...r.assets);
    state = r.state;
    if (r.done) break;
  }
  return { state, pages, assets };
}

describe("crawler", () => {
  const site = parseSiteUrl("https://www.pressdcafe.ae");

  test("crawls only the approved host, follows internal links, respects robots and exclusions", async () => {
    const { fetch, requested } = fakeSite({
      "/robots.txt": { status: 200, body: "User-agent: *\nDisallow: /private\nSitemap: https://www.pressdcafe.ae/sitemap.xml", headers: { "content-type": "text/plain" } },
      "/sitemap.xml": { status: 200, body: `<urlset><url><loc>https://www.pressdcafe.ae/</loc></url><url><loc>https://www.pressdcafe.ae/private/x</loc></url><url><loc>https://www.pressdcafe.ae/gone</loc></url></urlset>`, headers: { "content-type": "application/xml" } },
      "/": { status: 200, body: page("Home page title that is long enough", `<h1>Home</h1><a href="/about">About</a><a href="https://evil.example/">x</a><a href="/admin/seo">admin</a><a href="/?sort=1">q</a><a href="mailto:a@b.c">m</a><img src="/assets/a.webp" alt="a"><img src="/assets/missing.webp">`) },
      "/about": { status: 200, body: page("About page title that is long enough", `<h1>About</h1><a href="/old">old</a><a href="/">home</a><a href="/gone">gone</a>`) },
      "/old": { status: 301, headers: { location: "/older" } },
      "/older": { status: 301, headers: { location: "/about" } },
      "/assets/a.webp": { status: 200, headers: { "content-type": "image/webp" } },
    });
    const { pages, assets, state } = await runAll(initialState(site), deps(fetch));
    const urls = pages.map((p) => p.url).sort();
    assert.deepEqual(urls, [
      "https://www.pressdcafe.ae/",
      "https://www.pressdcafe.ae/about",
      "https://www.pressdcafe.ae/gone",
      "https://www.pressdcafe.ae/old",
      "https://www.pressdcafe.ae/private/x",
    ]);
    assert.ok(requested.every((r) => r.includes("https://www.pressdcafe.ae/")), "never requested another host");
    assert.ok(!requested.some((r) => r.includes("/admin") || r.includes("/private") || r.includes("sort=")), "excluded and disallowed URLs not fetched");
    assert.equal(pages.find((p) => p.url.endsWith("/private/x"))!.robotsBlockedRule, "Disallow: /private");
    const old = pages.find((p) => p.url.endsWith("/old"))!;
    assert.deepEqual(old.redirectChain.map((h) => h.status), [301, 301]);
    assert.equal(old.finalUrl, "https://www.pressdcafe.ae/about");
    assert.equal(assets.find((a) => a.url.endsWith("missing.webp"))!.status, 404);
    assert.equal(state.skipped["external-host"] >= 1, true);

    const issues = evaluate({ state, pages, assets });
    const types = new Set(issues.map((i) => i.type));
    for (const t of ["sitemap_url_blocked", "http_error", "sitemap_url_error", "redirect_chain", "internal_link_to_redirect", "img_alt_missing", "broken_asset", "broken_internal_link"]) {
      assert.ok(types.has(t), `expected ${t}`);
    }
    const broken = issues.find((i) => i.type === "broken_asset")!;
    assert.equal(broken.url, "https://www.pressdcafe.ae/");
    assert.equal((broken.evidence as { status: number }).status, 404);
    const counts = countBySeverity(issues);
    assert.equal(Object.values(counts).reduce((a, b) => a + b), issues.length);
  });

  test("detects redirect loops and off-site redirects without following them", async () => {
    const { fetch, requested } = fakeSite({
      "/robots.txt": { status: 404 },
      "/": { status: 200, body: page("Home page title that is long enough", `<h1>x</h1><a href="/loop-a">a</a><a href="/out">b</a>`) },
      "/loop-a": { status: 302, headers: { location: "/loop-b" } },
      "/loop-b": { status: 302, headers: { location: "/loop-a" } },
      "/out": { status: 301, headers: { location: "https://elsewhere.example/" } },
    });
    const { pages, state, assets } = await runAll(initialState(site), deps(fetch));
    assert.equal(pages.find((p) => p.url.endsWith("/loop-a"))!.redirectLoop, true);
    assert.equal(pages.find((p) => p.url.endsWith("/out"))!.redirectOffsite, "https://elsewhere.example/");
    assert.ok(!requested.some((r) => r.includes("elsewhere.example")));
    const types = evaluate({ state, pages, assets }).map((i) => i.type);
    assert.ok(types.includes("redirect_loop"));
    assert.ok(types.includes("redirect_offsite"));
    assert.ok(types.includes("robots_missing"));
    assert.ok(types.includes("sitemap_missing"));
  });

  test("refuses to fetch when the approved host resolves to a private address", async () => {
    const { fetch, requested } = fakeSite({ "/": { status: 200, body: "x" } });
    const { pages } = await runAll(initialState(site), deps(fetch, async () => [{ address: "169.254.169.254", family: 4 }]));
    assert.equal(requested.length, 0);
    assert.match(pages[0].error ?? "", /non-public address/);
  });

  test("honours maxPages and bounded steps", async () => {
    const links = Array.from({ length: 50 }, (_, i) => `<a href="/p${i}">p</a>`).join("");
    const routes: Record<string, Route> = { "/robots.txt": { status: 404 }, "/": { status: 200, body: page("Home page title that is long enough", links) } };
    for (let i = 0; i < 50; i++) routes[`/p${i}`] = { status: 200, body: page(`Page ${i} with a long enough title here`, `<h1>${i}</h1>`) };
    const { fetch } = fakeSite(routes);
    const { pages, state } = await runAll(initialState(site), deps(fetch), { maxPages: 10 });
    assert.equal(pages.length, 10);
    assert.match(state.limitReached ?? "", /maxPages/);
  });

  test("a step stops when its time budget is spent and resumes from saved state", async () => {
    const links = Array.from({ length: 12 }, (_, i) => `<a href="/p${i}">p</a>`).join("");
    const routes: Record<string, Route> = { "/robots.txt": { status: 404 }, "/": { status: 200, body: page("Home page title that is long enough", links) } };
    for (let i = 0; i < 12; i++) routes[`/p${i}`] = { status: 200, body: page(`Page ${i} with a long enough title here`, "") };
    const { fetch } = fakeSite(routes);
    const first = await crawlStep(initialState(site), deps(fetch), { concurrency: 1 }, 40);
    assert.equal(first.done, false);
    const restored = JSON.parse(JSON.stringify(first.state)) as CrawlState; // survives persistence
    const rest = await runAll(restored, deps(fetch), { concurrency: 1 });
    const all = [...first.pages, ...rest.pages].map((p) => p.url);
    assert.equal(all.length, 13);
    assert.equal(new Set(all).size, 13, "no page crawled twice");
  });

  test("duplicate titles and identical content are reported across pages", async () => {
    const body = "<h1>Same</h1><p>" + "identical words ".repeat(30) + "</p>";
    const { fetch } = fakeSite({
      "/robots.txt": { status: 404 },
      "/": { status: 200, body: page("Same title for both pages here", body + '<a href="/copy">c</a>') },
      "/copy": { status: 200, body: page("Same title for both pages here", body + '<a href="/copy">c</a>') },
    });
    const r = await runAll(initialState(site), deps(fetch));
    const types = evaluate(r).map((i) => `${i.type} ${i.url}`);
    assert.ok(types.includes("title_duplicate https://www.pressdcafe.ae/copy"));
    assert.ok(types.includes("duplicate_content https://www.pressdcafe.ae/"));
  });
});

describe("crawler time bounds", () => {
  const site = parseSiteUrl("https://www.pressdcafe.ae");
  const realDeps = (fetch: FetchFn, lookup?: CrawlDeps["lookup"]): CrawlDeps => ({ fetch, lookup: lookup ?? (async () => [{ address: "76.76.21.21", family: 4 }]), now: () => Date.now(), userAgent: "PRESSD-SEO-Audit test", sleep: async () => {} });
  const never = () => new Promise<never>(() => {});
  // AbortSignal.timeout() timers are unref'd; a server keeps the process alive, a bare test does not.
  let keepAlive: ReturnType<typeof setInterval>;
  beforeEach(() => { keepAlive = setInterval(() => {}, 1000); });
  afterEach(() => clearInterval(keepAlive));

  test("a server that never answers (and a fetch that ignores abort) cannot stall a step", async () => {
    const t0 = Date.now();
    const r = await crawlStep(initialState(site), realDeps(() => never()), { requestTimeoutMs: 300 }, 200);
    assert.ok(Date.now() - t0 < 4000, `step took ${Date.now() - t0} ms`);
    assert.equal(r.done, false);
  });

  test("a DNS lookup that never resolves times out per request", async () => {
    const t0 = Date.now();
    const r = await crawlStep(initialState(site), realDeps(async () => { throw new Error("unreachable"); }, () => never()), { requestTimeoutMs: 300 }, 5000);
    assert.ok(Date.now() - t0 < 6000, `step took ${Date.now() - t0} ms`);
    assert.match(r.pages[0]?.error ?? "", /DNS lookup .* timed out/);
  });

  test("a body that never finishes is cut off per request", async () => {
    const hanging: FetchFn = async (url) => {
      const path = new URL(url).pathname;
      if (path === "/robots.txt") return { status: 404, headers: new Headers(), body: null, text: async () => "" };
      return { status: 200, headers: new Headers({ "content-type": "text/html" }), body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("<html><title>x")); } }), text: () => never() };
    };
    const t0 = Date.now();
    const r = await crawlStep(initialState(site), realDeps(hanging), { requestTimeoutMs: 300 }, 5000);
    assert.ok(Date.now() - t0 < 6000, `step took ${Date.now() - t0} ms`);
    assert.match(r.pages[0]?.error ?? "", /Body not received/);
  });
});
