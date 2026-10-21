// Bounded, resumable crawler for the verified production site. Pure module:
// network access (fetch + DNS) is injected so it can be tested offline.
//
// The crawl runs in steps. Each step does as much work as fits in its time
// budget and returns a JSON-serialisable state, so a serverless function can
// persist it and continue in the next request instead of running unbounded.

import { assertSafeTarget, BlockedTargetError, type LookupFn } from "./net-guard.ts";
import { crawlScope, normalizeUrl, type ScopeDecision } from "./url.ts";
import { isAllowedByRobots, parseRobots } from "./robots.ts";
import { extractPageFacts, extractSitemapLocs, type PageFacts } from "./html.ts";

export interface CrawlLimits {
  maxPages: number;
  maxDepth: number;
  maxQueue: number;
  concurrency: number;
  requestTimeoutMs: number;
  maxRedirects: number;
  maxBodyBytes: number;
  maxSitemaps: number;
  maxAssetChecks: number;
}

export const DEFAULT_LIMITS: CrawlLimits = {
  maxPages: 200,
  maxDepth: 6,
  maxQueue: 2000,
  concurrency: 3,
  requestTimeoutMs: 12000,
  maxRedirects: 5,
  maxBodyBytes: 3_000_000,
  maxSitemaps: 10,
  maxAssetChecks: 150,
};

const HARD_MAX: CrawlLimits = {
  maxPages: 1000,
  maxDepth: 10,
  maxQueue: 5000,
  concurrency: 5,
  requestTimeoutMs: 20000,
  maxRedirects: 10,
  maxBodyBytes: 5_000_000,
  maxSitemaps: 25,
  maxAssetChecks: 500,
};

export function clampLimits(input: Partial<CrawlLimits> | undefined): CrawlLimits {
  const out = { ...DEFAULT_LIMITS };
  for (const key of Object.keys(DEFAULT_LIMITS) as (keyof CrawlLimits)[]) {
    const v = input?.[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 1) out[key] = Math.min(Math.floor(v), HARD_MAX[key]);
  }
  return out;
}

export interface ResponseLike {
  status: number;
  headers: { get(name: string): string | null };
  body?: ReadableStream<Uint8Array> | null;
  text(): Promise<string>;
}

export type FetchFn = (
  url: string,
  init: { method: "GET" | "HEAD"; redirect: "manual"; headers: Record<string, string>; signal: AbortSignal },
) => Promise<ResponseLike>;

export interface CrawlDeps {
  fetch: FetchFn;
  lookup: LookupFn;
  now: () => number;
  userAgent: string;
  sleep?: (ms: number) => Promise<void>;
}

export interface Hop {
  url: string;
  status: number;
}

export interface FetchedPage {
  url: string;
  depth: number;
  inSitemap: boolean;
  foundOn: string | null;
  fetchedAt: string;
  status: number | null;
  error: string | null;
  redirectChain: Hop[]; // every 3xx hop, in order
  finalUrl: string | null;
  redirectLoop: boolean;
  redirectOffsite: string | null;
  contentType: string | null;
  xRobotsTag: string | null;
  robotsBlockedRule: string | null; // set when robots.txt disallows the URL (not fetched)
  responseMs: number | null;
  facts: PageFacts | null;
  outlinks: string[]; // normalised same-host link targets (pages and files)
  truncated: boolean;
}

export interface AssetCheck {
  url: string;
  status: number | null;
  error: string | null;
  finalUrl: string | null;
}

export interface CrawlState {
  site: string;
  phase: "discover" | "crawl" | "assets" | "done";
  robots: { status: number | null; error: string | null; raw: string | null } | null;
  sitemaps: { url: string; status: number | null; error: string | null; entries: number }[];
  sitemapEntries: string[]; // normalised page URLs listed in sitemaps (in scope)
  queue: { url: string; depth: number; foundOn: string | null }[];
  seen: string[];
  skipped: Record<string, number>;
  assetQueue: string[];
  assetsChecked: AssetCheck[];
  pagesDone: number;
  limitReached: string | null;
}

export function initialState(site: URL): CrawlState {
  return {
    site: site.origin + "/",
    phase: "discover",
    robots: null,
    sitemaps: [],
    sitemapEntries: [],
    queue: [],
    seen: [],
    skipped: {},
    assetQueue: [],
    assetsChecked: [],
    pagesDone: 0,
    limitReached: null,
  };
}

/** Rejects if `p` has not settled within `ms` (for calls that cannot be aborted, e.g. DNS). */
function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([p, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]).finally(() => clearTimeout(timer));
}

/** Rejects as soon as `signal` aborts, even if `p` itself ignores the signal. */
function raceAbort<T>(p: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  let onAbort: () => void = () => {};
  return Promise.race([p, new Promise<never>((_, reject) => { onAbort = () => reject(signal.reason); signal.addEventListener("abort", onAbort, { once: true }); })]).finally(() =>
    signal.removeEventListener("abort", onAbort),
  );
}

function bump(state: CrawlState, reason: string) {
  state.skipped[reason] = (state.skipped[reason] ?? 0) + 1;
}

async function readCapped(res: ResponseLike, max: number, signal: AbortSignal): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) {
    const t = await raceAbort(res.text(), signal);
    return t.length > max ? { text: t.slice(0, max), truncated: true } : { text: t, truncated: false };
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  for (;;) {
    const { value, done } = await raceAbort(reader.read(), signal).catch(async (e) => {
      void reader.cancel().catch(() => {});
      throw e;
    });
    if (done) break;
    if (size + value.byteLength > max) {
      chunks.push(value.subarray(0, max - size));
      truncated = true;
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
    size += value.byteLength;
  }
  const all = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let off = 0;
  for (const c of chunks) {
    all.set(c, off);
    off += c.byteLength;
  }
  return { text: new TextDecoder().decode(all), truncated };
}

interface FetchOutcome {
  status: number | null;
  error: string | null;
  chain: Hop[];
  finalUrl: string | null;
  loop: boolean;
  offsite: string | null;
  res: ResponseLike | null;
  ms: number | null;
}

/** Fetches with manual redirects; every hop is re-validated against the SSRF guard. */
async function fetchFollowing(
  start: string,
  method: "GET" | "HEAD",
  site: URL,
  deps: CrawlDeps,
  limits: CrawlLimits,
  signal: AbortSignal,
): Promise<FetchOutcome> {
  const chain: Hop[] = [];
  const visited = new Set<string>();
  let current = start;
  const t0 = deps.now();
  for (let hop = 0; hop <= limits.maxRedirects; hop++) {
    const u = new URL(current);
    try {
      await assertSafeTarget(u, [site.hostname], (h) => withTimeout(deps.lookup(h), limits.requestTimeoutMs, `DNS lookup for ${h} timed out`));
    } catch (e) {
      if (e instanceof BlockedTargetError && chain.length) {
        return { status: chain[chain.length - 1].status, error: null, chain, finalUrl: null, loop: false, offsite: current, res: null, ms: deps.now() - t0 };
      }
      return { status: null, error: e instanceof Error ? e.message : "blocked", chain, finalUrl: null, loop: false, offsite: null, res: null, ms: null };
    }
    visited.add(current);
    let res: ResponseLike | null = null;
    let lastErr = "";
    for (let attempt = 0; attempt < 2 && !res; attempt++) {
      try {
        const timeout = AbortSignal.timeout(limits.requestTimeoutMs);
        const reqSignal = AbortSignal.any([signal, timeout]);
        const r = await raceAbort(
          deps.fetch(current, {
            method,
            redirect: "manual",
            headers: { "user-agent": deps.userAgent, accept: method === "GET" ? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5" : "*/*" },
            signal: reqSignal,
          }),
          reqSignal,
        );
        if ((r.status === 429 || r.status === 503) && attempt === 0) {
          const ra = Number(r.headers.get("retry-after"));
          await (deps.sleep ?? ((ms) => new Promise((ok) => setTimeout(ok, ms))))(Math.min(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 1000, 5000));
          continue;
        }
        res = r;
      } catch (e) {
        if (signal.aborted) throw e;
        lastErr = e instanceof Error ? (e.name === "TimeoutError" ? `Timed out after ${limits.requestTimeoutMs} ms` : e.message) : "Network error";
      }
    }
    if (!res) return { status: null, error: lastErr || "Request failed", chain, finalUrl: null, loop: false, offsite: null, res: null, ms: null };
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      chain.push({ url: current, status: res.status });
      const next = normalizeUrl(loc, current);
      if (!next) return { status: res.status, error: `Invalid redirect location "${loc.slice(0, 200)}"`, chain, finalUrl: null, loop: false, offsite: null, res: null, ms: deps.now() - t0 };
      if (visited.has(next.url)) return { status: res.status, error: null, chain, finalUrl: next.url, loop: true, offsite: null, res: null, ms: deps.now() - t0 };
      if (next.parsed.host !== site.host || next.parsed.protocol !== site.protocol) {
        return { status: res.status, error: null, chain, finalUrl: null, loop: false, offsite: next.url, res: null, ms: deps.now() - t0 };
      }
      current = next.url;
      continue;
    }
    return { status: res.status, error: null, chain, finalUrl: current, loop: false, offsite: null, res, ms: deps.now() - t0 };
  }
  return { status: chain.at(-1)?.status ?? null, error: `More than ${limits.maxRedirects} redirects`, chain, finalUrl: null, loop: false, offsite: null, res: null, ms: deps.now() - t0 };
}

function enqueue(state: CrawlState, url: string, depth: number, foundOn: string | null, limits: CrawlLimits, site: URL, decision?: ScopeDecision) {
  const n = normalizeUrl(url, site.origin);
  if (!n) return bump(state, "invalid-url");
  const scope = decision ?? crawlScope(n, site);
  if (!scope.ok) return bump(state, scope.reason);
  if (state.seen.includes(n.url)) return;
  if (depth > limits.maxDepth) return bump(state, "max-depth");
  if (state.seen.length >= limits.maxQueue) {
    state.limitReached ??= `Discovery stopped at ${limits.maxQueue} URLs (maxQueue)`;
    return bump(state, "max-queue");
  }
  state.seen.push(n.url);
  state.queue.push({ url: n.url, depth, foundOn });
}

async function discover(state: CrawlState, site: URL, deps: CrawlDeps, limits: CrawlLimits, signal: AbortSignal) {
  const robotsUrl = new URL("/robots.txt", site).toString();
  const r = await fetchFollowing(robotsUrl, "GET", site, deps, limits, signal);
  let raw: string | null = null;
  let robotsError = r.error;
  if (r.res && r.status === 200) {
    try {
      raw = (await readCapped(r.res, 500_000, AbortSignal.any([signal, AbortSignal.timeout(limits.requestTimeoutMs)]))).text;
    } catch (e) {
      if (signal.aborted) throw e;
      robotsError = `robots.txt body not received within ${limits.requestTimeoutMs} ms`;
    }
  }
  state.robots = { status: r.status, error: robotsError, raw };
  const robots = parseRobots(raw, deps.userAgent);

  const candidates = robots.sitemaps.length ? robots.sitemaps : [new URL("/sitemap.xml", site).toString()];
  const pending = [...candidates];
  const entries = new Set<string>();
  while (pending.length && state.sitemaps.length < limits.maxSitemaps) {
    const smUrl = pending.shift()!;
    const n = normalizeUrl(smUrl, site.origin);
    if (!n || n.parsed.host !== site.host) {
      state.sitemaps.push({ url: smUrl, status: null, error: "Sitemap is not on the approved host; not fetched", entries: 0 });
      continue;
    }
    const s = await fetchFollowing(n.url, "GET", site, deps, limits, signal);
    if (!s.res || s.status !== 200) {
      state.sitemaps.push({ url: n.url, status: s.status, error: s.error ?? (s.offsite ? `Redirects off-site to ${s.offsite}` : null), entries: 0 });
      continue;
    }
    let xml: string;
    try {
      xml = (await readCapped(s.res, limits.maxBodyBytes, AbortSignal.any([signal, AbortSignal.timeout(limits.requestTimeoutMs)]))).text;
    } catch (e) {
      if (signal.aborted) throw e;
      state.sitemaps.push({ url: n.url, status: s.status, error: `Sitemap body not received within ${limits.requestTimeoutMs} ms`, entries: 0 });
      continue;
    }
    const { locs, isIndex } = extractSitemapLocs(xml);
    state.sitemaps.push({ url: n.url, status: s.status, error: null, entries: locs.length });
    if (isIndex) pending.push(...locs);
    else for (const loc of locs) {
      const ln = normalizeUrl(loc);
      if (ln) entries.add(ln.url);
    }
  }
  state.sitemapEntries = [...entries].slice(0, limits.maxQueue);
  enqueue(state, site.toString(), 0, null, limits, site);
  // sitemap URLs are queued even when out of normal scope rules would allow,
  // as long as they are on the approved host, so errors in them are reported
  for (const e of state.sitemapEntries) {
    const n = normalizeUrl(e)!;
    const sameHost = n.parsed.host === site.host && n.parsed.protocol === site.protocol;
    enqueue(state, e, 0, null, limits, site, sameHost ? { ok: true } : { ok: false, reason: "external-host" });
  }
  state.phase = "crawl";
}

async function crawlOne(
  item: { url: string; depth: number; foundOn: string | null },
  state: CrawlState,
  site: URL,
  deps: CrawlDeps,
  limits: CrawlLimits,
  signal: AbortSignal,
): Promise<FetchedPage> {
  const page: FetchedPage = {
    url: item.url,
    depth: item.depth,
    inSitemap: state.sitemapEntries.includes(item.url),
    foundOn: item.foundOn,
    fetchedAt: new Date(deps.now()).toISOString(),
    status: null,
    error: null,
    redirectChain: [],
    finalUrl: null,
    redirectLoop: false,
    redirectOffsite: null,
    contentType: null,
    xRobotsTag: null,
    robotsBlockedRule: null,
    responseMs: null,
    facts: null,
    outlinks: [],
    truncated: false,
  };
  const robots = parseRobots(state.robots?.raw ?? null, deps.userAgent);
  const u = new URL(item.url);
  const verdict = isAllowedByRobots(robots, u.pathname + u.search);
  if (!verdict.allowed) {
    page.robotsBlockedRule = verdict.rule;
    return page;
  }
  const r = await fetchFollowing(item.url, "GET", site, deps, limits, signal);
  Object.assign(page, {
    status: r.status,
    error: r.error,
    redirectChain: r.chain,
    finalUrl: r.finalUrl,
    redirectLoop: r.loop,
    redirectOffsite: r.offsite,
    responseMs: r.ms,
  });
  if (!r.res) return page;
  page.contentType = r.res.headers.get("content-type");
  page.xRobotsTag = r.res.headers.get("x-robots-tag");
  if (r.status !== 200 || !(page.contentType ?? "").toLowerCase().includes("html")) {
    void r.res.body?.cancel().catch(() => {}); // don't wait on discarded bodies
    return page;
  }
  let text: string;
  let truncated: boolean;
  try {
    ({ text, truncated } = await readCapped(r.res, limits.maxBodyBytes, AbortSignal.any([signal, AbortSignal.timeout(limits.requestTimeoutMs)])));
  } catch (e) {
    if (signal.aborted) throw e;
    page.error = `Body not received within ${limits.requestTimeoutMs} ms`;
    return page;
  }
  page.truncated = truncated;
  page.facts = extractPageFacts(text);
  const base = r.finalUrl ?? item.url;
  const out = new Set<string>();
  for (const link of page.facts.links) {
    if (/^(mailto|tel|javascript|sms|whatsapp):/i.test(link.href) || link.href.startsWith("#")) continue;
    const n = normalizeUrl(link.href, base);
    if (!n) continue;
    if (n.parsed.host !== site.host) {
      bump(state, "external-host"); // external links are listed, not crawled
      continue;
    }
    out.add(n.url);
  }
  page.outlinks = [...out];
  for (const target of page.outlinks) {
    const n = normalizeUrl(target)!;
    const scope = crawlScope(n, site);
    if (scope.ok) {
      if (state.pagesDone + state.queue.length < limits.maxPages || state.seen.includes(n.url)) enqueue(state, target, item.depth + 1, item.url, limits, site);
      else {
        state.limitReached ??= `Crawl stopped at ${limits.maxPages} pages (maxPages)`;
        bump(state, "max-pages");
      }
    } else if (scope.reason === "non-page-asset" && !state.assetQueue.includes(n.url)) {
      if (state.assetQueue.length < limits.maxAssetChecks) state.assetQueue.push(n.url);
    } else bump(state, scope.reason);
  }
  for (const img of page.facts.images) {
    if (!img.src || img.src.startsWith("data:")) continue;
    const n = normalizeUrl(img.src, base);
    if (!n || n.parsed.host !== site.host || n.hadQuery || n.parsed.pathname.startsWith("/_next/")) continue;
    if (!state.assetQueue.includes(n.url) && state.assetQueue.length < limits.maxAssetChecks) state.assetQueue.push(n.url);
  }
  return page;
}

async function assetCheck(url: string, site: URL, deps: CrawlDeps, limits: CrawlLimits, signal: AbortSignal): Promise<AssetCheck> {
  let r = await fetchFollowing(url, "HEAD", site, deps, limits, signal);
  if (r.status === 405 || r.status === 501) r = await fetchFollowing(url, "GET", site, deps, limits, signal);
  void r.res?.body?.cancel().catch(() => {});
  return { url, status: r.status, error: r.error, finalUrl: r.finalUrl };
}

/** Re-fetches one page using a saved crawl state (robots rules, sitemap list) without touching that state. */
export function fetchSinglePage(url: string, stateIn: CrawlState, deps: CrawlDeps, limitsIn?: Partial<CrawlLimits>): Promise<FetchedPage> {
  const state = structuredClone(stateIn);
  return crawlOne({ url, depth: 0, foundOn: null }, state, new URL(state.site), deps, clampLimits(limitsIn), new AbortController().signal);
}

export function checkSingleAsset(url: string, site: URL, deps: CrawlDeps, limitsIn?: Partial<CrawlLimits>): Promise<AssetCheck> {
  return assetCheck(url, site, deps, clampLimits(limitsIn), new AbortController().signal);
}

export interface StepResult {
  state: CrawlState;
  pages: FetchedPage[];
  assets: AssetCheck[];
  done: boolean;
}

/** Runs one bounded step of the crawl. Stops early when `budgetMs` is used up or `signal` aborts. */
export async function crawlStep(
  stateIn: CrawlState,
  deps: CrawlDeps,
  limitsIn: Partial<CrawlLimits> | undefined,
  budgetMs: number,
  signal: AbortSignal = new AbortController().signal,
): Promise<StepResult> {
  const state: CrawlState = structuredClone(stateIn);
  const limits = clampLimits(limitsIn);
  const site = new URL(state.site);
  const deadline = deps.now() + budgetMs;
  const pages: FetchedPage[] = [];
  const assets: AssetCheck[] = [];
  // Hard stop: the budget is checked between batches, so in-flight requests are
  // also aborted shortly after it, keeping every step bounded in wall time.
  const hard = AbortSignal.any([signal, AbortSignal.timeout(budgetMs + limits.requestTimeoutMs + 5000)]);
  const overran = () => hard.aborted && !signal.aborted;

  if (state.phase === "discover") {
    try {
      await discover(state, site, deps, limits, hard);
    } catch (e) {
      if (overran()) return { state: structuredClone(stateIn), pages, assets, done: false }; // retry next step
      throw e;
    }
  }

  while (state.phase === "crawl" && deps.now() < deadline && !hard.aborted) {
    if (!state.queue.length || state.pagesDone >= limits.maxPages) {
      if (state.queue.length) state.limitReached ??= `Crawl stopped at ${limits.maxPages} pages (maxPages)`;
      state.queue = [];
      state.phase = "assets";
      break;
    }
    const batch = state.queue.splice(0, Math.min(limits.concurrency, limits.maxPages - state.pagesDone));
    let results: FetchedPage[];
    try {
      results = await Promise.all(batch.map((item) => crawlOne(item, state, site, deps, limits, hard)));
    } catch (e) {
      if (!overran()) throw e;
      state.queue.unshift(...batch); // interrupted by the hard stop: redo these next step
      break;
    }
    state.pagesDone += results.length;
    pages.push(...results);
  }

  while (state.phase === "assets" && deps.now() < deadline && !hard.aborted) {
    const done = new Set(state.assetsChecked.map((a) => a.url));
    const todo = state.assetQueue.filter((u) => !done.has(u)).slice(0, limits.concurrency);
    if (!todo.length) {
      state.phase = "done";
      break;
    }
    let checks: AssetCheck[];
    try {
      checks = await Promise.all(todo.map((url) => assetCheck(url, site, deps, limits, hard)));
    } catch (e) {
      if (!overran()) throw e;
      break;
    }
    state.assetsChecked.push(...checks);
    assets.push(...checks);
  }

  return { state, pages, assets, done: state.phase === "done" };
}
