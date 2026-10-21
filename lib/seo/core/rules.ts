// Turns crawl evidence into audit issues. Pure module.
// Every issue carries the evidence it was derived from. Length thresholds are
// configurable guidance, not Google rules, and the copy says so.

import type { AssetCheck, CrawlState, FetchedPage } from "./crawler.ts";
import { fnv1a } from "./html.ts";
import { normalizeUrl } from "./url.ts";

export type Severity = "critical" | "high" | "medium" | "low";
export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

export interface AuditThresholds {
  titleMin: number;
  titleMax: number;
  descriptionMin: number;
  descriptionMax: number;
}

export const DEFAULT_THRESHOLDS: AuditThresholds = {
  titleMin: 30,
  titleMax: 60,
  descriptionMin: 70,
  descriptionMax: 160,
};

export interface DetectedIssue {
  fingerprint: string;
  type: string;
  severity: Severity;
  url: string;
  title: string;
  explanation: string;
  fix: string;
  evidence: Record<string, unknown>;
}

export const ISSUE_LABELS: Record<string, string> = {
  http_error: "Page returns an error status",
  fetch_failed: "Page could not be fetched",
  broken_internal_link: "Broken internal link",
  broken_asset: "Broken internal file or image",
  redirect_chain: "Redirect chain",
  redirect_loop: "Redirect loop",
  redirect_offsite: "Redirects to another host",
  internal_link_to_redirect: "Internal link points to a redirect",
  title_missing: "Missing title",
  title_multiple: "Multiple title tags",
  title_length: "Title length outside guidance",
  title_duplicate: "Duplicate title",
  description_missing: "Missing meta description",
  description_multiple: "Multiple meta descriptions",
  description_length: "Meta description length outside guidance",
  description_duplicate: "Duplicate meta description",
  h1_missing: "Missing H1",
  h1_multiple: "Multiple H1 headings",
  img_alt_missing: "Images without alt attribute",
  canonical_missing: "Missing canonical URL",
  canonical_multiple: "Multiple canonical tags",
  canonical_invalid: "Invalid canonical URL",
  canonical_offsite: "Canonical points to another host",
  canonical_target_problem: "Canonical target is not a working, indexable page",
  canonical_elsewhere: "Canonical points to a different URL",
  noindex_conflict: "Indexability conflict",
  sitemap_missing: "No XML sitemap found",
  sitemap_error: "Sitemap could not be read",
  sitemap_url_error: "Sitemap URL returns an error",
  sitemap_url_redirect: "Sitemap URL redirects",
  sitemap_url_noindex: "Sitemap URL is not indexable",
  sitemap_url_blocked: "Sitemap URL is blocked by robots.txt",
  robots_missing: "No robots.txt file",
  robots_error: "robots.txt returns an error",
  structured_data_invalid: "Structured data is not valid JSON",
  structured_data_incomplete: "Structured data missing @context or @type",
  duplicate_content: "Pages with identical content",
  html_lang_missing: "Missing html lang attribute",
  viewport_missing: "Missing viewport meta tag",
  social_meta_missing: "Missing social sharing metadata",
  truncated_html: "HTML larger than the crawl limit",
};

function fp(type: string, url: string, detail = ""): string {
  return `${type}:${fnv1a(url)}:${fnv1a(detail)}`;
}

function isNoindex(p: FetchedPage): boolean {
  const directives = [...(p.facts?.metaRobots ?? []), (p.xRobotsTag ?? "").toLowerCase()].join(",");
  return /\b(noindex|none)\b/.test(directives);
}

export interface RuleInput {
  state: CrawlState;
  pages: FetchedPage[];
  assets: AssetCheck[];
  thresholds?: Partial<AuditThresholds>;
}

export function evaluate({ state, pages, assets, thresholds }: RuleInput): DetectedIssue[] {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const site = new URL(state.site);
  const issues: DetectedIssue[] = [];
  const add = (i: Omit<DetectedIssue, "fingerprint" | "title"> & { detail?: string }) => {
    const { detail, ...rest } = i;
    issues.push({ ...rest, title: ISSUE_LABELS[i.type] ?? i.type, fingerprint: fp(i.type, i.url, detail) });
  };
  const byUrl = new Map(pages.map((p) => [p.url, p]));
  const assetByUrl = new Map(assets.map((a) => [a.url, a]));
  const ok = (p: FetchedPage) => p.status === 200 && !!p.facts;

  // ---- site level: robots.txt and sitemaps ----
  if (state.robots) {
    if (state.robots.status === 404) {
      add({ type: "robots_missing", severity: "low", url: new URL("/robots.txt", site).toString(), evidence: { status: 404 },
        explanation: "robots.txt returned 404. Crawlers then assume everything may be crawled, which is fine, but the file is also the usual place to point them at your sitemap.",
        fix: "Add app/robots.ts that allows public pages, disallows /admin and /api, and lists the sitemap URL." });
    } else if (state.robots.status !== 200) {
      add({ type: "robots_error", severity: state.robots.status && state.robots.status >= 500 ? "high" : "medium", url: new URL("/robots.txt", site).toString(),
        evidence: { status: state.robots.status, error: state.robots.error },
        explanation: "robots.txt did not return 200. A 5xx response can make Google pause crawling the whole site.",
        fix: "Make /robots.txt return 200 with valid directives (or 404 if you intentionally have none)." });
    }
  }
  const sitemapOk = state.sitemaps.some((s) => s.status === 200);
  if (!sitemapOk) {
    const tried = state.sitemaps.map((s) => ({ url: s.url, status: s.status, error: s.error }));
    if (state.sitemaps.every((s) => s.status === 404)) {
      add({ type: "sitemap_missing", severity: "medium", url: state.sitemaps[0]?.url ?? new URL("/sitemap.xml", site).toString(), evidence: { tried },
        explanation: "No XML sitemap was found (robots.txt lists none and /sitemap.xml returns 404). A sitemap helps search engines discover pages and is required to use the Sitemaps report in Search Console.",
        fix: "Add app/sitemap.ts listing every public, indexable URL, reference it from robots.txt and submit it in Search Console." });
    } else {
      for (const s of state.sitemaps.filter((x) => x.status !== 200)) {
        add({ type: "sitemap_error", severity: "high", url: s.url, evidence: { status: s.status, error: s.error },
          explanation: "A sitemap listed for the site could not be read.", fix: "Make the sitemap return 200 with valid XML, or remove the reference." });
      }
    }
  }

  // ---- per page ----
  const titleGroups = new Map<string, string[]>();
  const descGroups = new Map<string, string[]>();
  const textGroups = new Map<string, string[]>();

  for (const p of pages) {
    const inSm = state.sitemapEntries.includes(p.url);
    if (p.robotsBlockedRule) {
      if (inSm) add({ type: "sitemap_url_blocked", severity: "high", url: p.url, evidence: { rule: p.robotsBlockedRule },
        explanation: "This URL is listed in the sitemap but robots.txt forbids crawling it, so search engines receive contradictory signals.",
        fix: "Either remove the URL from the sitemap or change robots.txt so it can be crawled." });
      continue;
    }
    if (p.error && p.status === null) {
      add({ type: "fetch_failed", severity: "high", url: p.url, evidence: { error: p.error, foundOn: p.foundOn },
        explanation: "The crawler could not get a response for this URL (network error or timeout).",
        fix: "Open the URL to confirm it loads; check hosting logs if it times out." });
      continue;
    }
    if (p.redirectLoop) {
      add({ type: "redirect_loop", severity: "critical", url: p.url, evidence: { chain: p.redirectChain },
        explanation: "Following this URL's redirects returns to a URL already visited, so it never loads.",
        fix: "Correct the redirect rules so the URL resolves to one final 200 page." });
      continue;
    }
    if (p.redirectOffsite) {
      add({ type: "redirect_offsite", severity: "medium", url: p.url, evidence: { chain: p.redirectChain, destination: p.redirectOffsite },
        explanation: "This URL redirects to a different host, which the crawler does not follow.",
        fix: "Confirm the redirect is intended; internal links should point to the final URL." });
    }
    if (p.redirectChain.length > 1) {
      add({ type: "redirect_chain", severity: "medium", url: p.url, evidence: { chain: p.redirectChain, finalUrl: p.finalUrl },
        explanation: `This URL passes through ${p.redirectChain.length} redirects before reaching its destination. Each hop adds latency and some crawlers stop following long chains.`,
        fix: "Redirect directly to the final URL in a single hop." });
    }
    if (inSm && p.redirectChain.length) {
      add({ type: "sitemap_url_redirect", severity: "medium", url: p.url, evidence: { chain: p.redirectChain, finalUrl: p.finalUrl },
        explanation: "The sitemap should list final URLs; this one redirects.", fix: "List the redirect destination in the sitemap instead." });
    }
    if (p.status !== null && p.status >= 400) {
      add({ type: "http_error", severity: p.status >= 500 ? "critical" : "high", url: p.url, evidence: { status: p.status, finalUrl: p.finalUrl, foundOn: p.foundOn },
        explanation: `The URL returned HTTP ${p.status}.`, fix: p.status >= 500 ? "Investigate the server error in hosting logs." : "Restore the page, redirect it to the closest equivalent, or remove links to it." });
      if (inSm) add({ type: "sitemap_url_error", severity: "high", url: p.url, evidence: { status: p.status },
        explanation: "This URL is in the sitemap but returns an error.", fix: "Remove it from the sitemap or restore the page." });
      continue;
    }
    if (!ok(p)) continue;
    const f = p.facts!;
    const noindex = isNoindex(p);
    if (p.truncated) add({ type: "truncated_html", severity: "low", url: p.url, evidence: {},
      explanation: "The page HTML exceeded the crawl size limit, so only the first part was analysed.", fix: "No action needed unless the page is unusually heavy; consider reducing inline payloads." });

    // titles
    if (!f.titles.length || !f.titles[0]) {
      add({ type: "title_missing", severity: "high", url: p.url, evidence: { titles: f.titles },
        explanation: "The page has no <title>. Titles are a primary signal for what a page is about and are often used as the search result heading.",
        fix: "Add a unique, descriptive title in the page's metadata." });
    } else {
      if (f.titles.length > 1) add({ type: "title_multiple", severity: "medium", url: p.url, evidence: { titles: f.titles },
        explanation: "More than one <title> element was found; browsers and crawlers use only one.", fix: "Render a single title from the page metadata." });
      const title = f.titles[0];
      if (title.length < t.titleMin || title.length > t.titleMax) {
        add({ type: "title_length", severity: "low", url: p.url, detail: "len", evidence: { title, length: title.length, guidance: `${t.titleMin}–${t.titleMax} characters` },
          explanation: `The title is ${title.length} characters; the configured guidance is ${t.titleMin}–${t.titleMax}. This is a readability guideline (long titles are often truncated in results), not a Google rule.`,
          fix: title.length > t.titleMax ? "Shorten the title, keeping the most important words first." : "Make the title more descriptive." });
      }
      if (!noindex) titleGroups.set(title, [...(titleGroups.get(title) ?? []), p.url]);
    }

    // descriptions
    const desc = f.metaDescriptions[0];
    if (!f.metaDescriptions.length || !desc) {
      add({ type: "description_missing", severity: "medium", url: p.url, evidence: {},
        explanation: "No meta description was found. Search engines may generate a snippet from page text instead.",
        fix: "Add a concise description summarising the page." });
    } else {
      if (f.metaDescriptions.length > 1) add({ type: "description_multiple", severity: "low", url: p.url, evidence: { descriptions: f.metaDescriptions },
        explanation: "More than one meta description was found.", fix: "Render a single description." });
      if (desc.length < t.descriptionMin || desc.length > t.descriptionMax) {
        add({ type: "description_length", severity: "low", url: p.url, detail: "len", evidence: { description: desc, length: desc.length, guidance: `${t.descriptionMin}–${t.descriptionMax} characters` },
          explanation: `The description is ${desc.length} characters; the configured guidance is ${t.descriptionMin}–${t.descriptionMax}. Google may rewrite or truncate snippets regardless.`,
          fix: desc.length > t.descriptionMax ? "Tighten the description so the key message comes first." : "Expand the description with what makes the page useful." });
      }
      if (!noindex) descGroups.set(desc, [...(descGroups.get(desc) ?? []), p.url]);
    }

    // headings
    if (!f.h1s.length) add({ type: "h1_missing", severity: "medium", url: p.url, evidence: {},
      explanation: "No <h1> heading was found in the HTML.", fix: "Give the page one visible H1 that states its topic." });
    else if (f.h1s.length > 1) add({ type: "h1_multiple", severity: "low", url: p.url, evidence: { h1s: f.h1s.slice(0, 10), count: f.h1s.length },
      explanation: `${f.h1s.length} H1 headings were found. Multiple H1s are valid HTML, but one clear H1 usually makes the page structure easier to understand.`,
      fix: "Keep one H1 for the page topic and use H2/H3 for sections." });

    // images
    const noAlt = f.images.filter((i) => i.alt === null);
    if (noAlt.length) add({ type: "img_alt_missing", severity: "medium", url: p.url,
      evidence: { missing: noAlt.length, total: f.images.length, examples: noAlt.slice(0, 15).map((i) => i.src) },
      explanation: `${noAlt.length} of ${f.images.length} images have no alt attribute. Alt text describes images to screen readers and image search.`,
      fix: 'Add descriptive alt text; use alt="" for purely decorative images.' });

    // canonical
    if (!f.canonicals.length) {
      add({ type: "canonical_missing", severity: "medium", url: p.url, evidence: {},
        explanation: "No canonical link was found. Without one, search engines choose the preferred URL themselves (e.g. between www/non-www or with/without parameters).",
        fix: "Set alternates.canonical in the page metadata to the page's own absolute URL." });
    } else if (f.canonicals.length > 1 && new Set(f.canonicals).size > 1) {
      add({ type: "canonical_multiple", severity: "high", url: p.url, evidence: { canonicals: f.canonicals },
        explanation: "Several different canonical URLs were declared; search engines may ignore all of them.", fix: "Declare exactly one canonical URL." });
    } else {
      const raw = f.canonicals[0];
      const cn = normalizeUrl(raw, p.finalUrl ?? p.url);
      if (!cn || !/^https?:\/\//i.test(raw)) {
        add({ type: "canonical_invalid", severity: "medium", url: p.url, evidence: { canonical: raw },
          explanation: "The canonical URL is not an absolute http(s) URL.", fix: "Use an absolute URL such as https://www.pressdcafe.ae/." });
      } else if (cn.parsed.host !== site.host) {
        add({ type: "canonical_offsite", severity: "high", url: p.url, evidence: { canonical: cn.url },
          explanation: "The canonical points to a different host, telling search engines to index that host instead of this page.", fix: "Point the canonical at this site's own URL." });
      } else if (cn.url !== (p.finalUrl ?? p.url)) {
        const target = byUrl.get(cn.url);
        if (target && (!ok(target) || isNoindex(target) || target.redirectChain.length)) {
          add({ type: "canonical_target_problem", severity: "high", url: p.url, evidence: { canonical: cn.url, targetStatus: target.status, targetRedirects: target.redirectChain.length, targetNoindex: isNoindex(target) },
            explanation: "The canonical target redirects, errors or is noindex, so the canonical signal is unreliable.", fix: "Point the canonical at a working, indexable 200 URL." });
        } else {
          add({ type: "canonical_elsewhere", severity: "low", url: p.url, evidence: { canonical: cn.url },
            explanation: "This page names a different URL as canonical. That is correct for duplicates, but a mistake for unique pages.", fix: "Confirm this page is meant to consolidate into the canonical URL." });
        }
      }
    }

    // indexability conflicts
    if (noindex && inSm) add({ type: "sitemap_url_noindex", severity: "high", url: p.url, evidence: { metaRobots: f.metaRobots, xRobotsTag: p.xRobotsTag },
      explanation: "The sitemap asks search engines to index this URL but the page says noindex.", fix: "Remove noindex if the page should rank, otherwise drop it from the sitemap." });
    if (noindex && f.canonicals.length && normalizeUrl(f.canonicals[0], p.url)?.url !== p.url) {
      add({ type: "noindex_conflict", severity: "medium", url: p.url, detail: "canonical", evidence: { metaRobots: f.metaRobots, canonical: f.canonicals[0] },
        explanation: "The page is noindex and also canonicalises to another URL — mixed signals.", fix: "Use one mechanism: either noindex or a canonical to the preferred page." });
    }

    // structured data
    f.jsonLd.forEach((j, idx) => {
      if (!j.ok) add({ type: "structured_data_invalid", severity: "high", url: p.url, detail: String(idx), evidence: { block: idx + 1, error: j.error },
        explanation: "A JSON-LD block could not be parsed as JSON, so it is ignored entirely. (This is a syntax check only; it does not validate against Google's rich-result requirements.)",
        fix: "Fix the JSON syntax, then validate with Google's Rich Results Test." });
      else if (!j.hasContext || !j.types.length) add({ type: "structured_data_incomplete", severity: "medium", url: p.url, detail: String(idx), evidence: { block: idx + 1, types: j.types, hasContext: j.hasContext },
        explanation: "A JSON-LD block is missing @context or @type.", fix: 'Include "@context": "https://schema.org" and an "@type".' });
    });

    // basics
    if (!f.lang) add({ type: "html_lang_missing", severity: "low", url: p.url, evidence: {}, explanation: "The <html> element has no lang attribute.", fix: 'Set lang (e.g. "en") on the root html element.' });
    if (!f.viewport) add({ type: "viewport_missing", severity: "medium", url: p.url, evidence: {}, explanation: "No viewport meta tag; mobile browsers will render a desktop-width page.", fix: "Next.js adds one by default — check the layout's viewport export." });
    const missingSocial = ["og:title", "og:description", "og:image"].filter((k) => !f.og[k]);
    if (missingSocial.length) add({ type: "social_meta_missing", severity: "low", url: p.url, evidence: { missing: missingSocial },
      explanation: `Missing ${missingSocial.join(", ")}. Social networks and messaging apps use these for link previews.`,
      fix: "Add the missing Open Graph fields (and an og:image) to the page metadata." });

    if (!noindex && f.wordCount > 20) textGroups.set(f.textHash, [...(textGroups.get(f.textHash) ?? []), p.url]);

    // internal links pointing at problems
    for (const target of p.outlinks) {
      const tp = byUrl.get(target);
      const ta = assetByUrl.get(target);
      const status = tp ? tp.status : ta ? ta.status : undefined;
      const error = tp ? tp.error : ta ? ta.error : null;
      if ((status !== undefined && status !== null && status >= 400) || (status === null && error)) {
        add({ type: "broken_internal_link", severity: "high", url: p.url, detail: target, evidence: { target, status, error },
          explanation: `This page links to ${target}, which ${status ? `returns HTTP ${status}` : `failed: ${error}`}.`, fix: "Update or remove the link." });
      } else if (tp && tp.redirectChain.length) {
        add({ type: "internal_link_to_redirect", severity: "low", url: p.url, detail: target, evidence: { target, finalUrl: tp.finalUrl, hops: tp.redirectChain.length },
          explanation: "An internal link goes through a redirect.", fix: `Link directly to ${tp.finalUrl ?? "the final URL"}.` });
      }
    }
    for (const img of f.images) {
      const n = img.src ? normalizeUrl(img.src, p.finalUrl ?? p.url) : null;
      const a = n ? assetByUrl.get(n.url) : undefined;
      if (a && ((a.status !== null && a.status >= 400) || (a.status === null && a.error))) {
        add({ type: "broken_asset", severity: "medium", url: p.url, detail: a.url, evidence: { asset: a.url, status: a.status, error: a.error },
          explanation: `An image on this page (${a.url}) ${a.status ? `returns HTTP ${a.status}` : "failed to load"}.`, fix: "Fix the image path or replace the file." });
      }
    }
  }

  for (const [title, urls] of titleGroups) if (urls.length > 1) for (const u of urls) add({ type: "title_duplicate", severity: "medium", url: u, detail: title,
    evidence: { title, sharedWith: urls.filter((x) => x !== u) }, explanation: `${urls.length} indexable pages share this title.`, fix: "Give each page a distinct title." });
  for (const [desc, urls] of descGroups) if (urls.length > 1) for (const u of urls) add({ type: "description_duplicate", severity: "low", url: u, detail: desc,
    evidence: { description: desc, sharedWith: urls.filter((x) => x !== u) }, explanation: `${urls.length} indexable pages share this description.`, fix: "Write a distinct description for each page." });
  for (const [hash, urls] of textGroups) if (urls.length > 1) for (const u of urls) add({ type: "duplicate_content", severity: "medium", url: u, detail: hash,
    evidence: { sharedWith: urls.filter((x) => x !== u) }, explanation: "The visible text of these indexable pages is identical, which looks like duplicate URLs for the same content.",
    fix: "Redirect duplicates to one URL or set a canonical on the duplicates." });

  // de-duplicate by fingerprint (same issue found twice)
  const seen = new Set<string>();
  return issues.filter((i) => (seen.has(i.fingerprint) ? false : (seen.add(i.fingerprint), true)));
}

export function countBySeverity(issues: { severity: Severity }[]): Record<Severity, number> {
  const out: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const i of issues) out[i.severity]++;
  return out;
}
