// URL normalisation and crawl-scope rules. Pure module.

/** Query parameters that only track campaigns; stripped before de-duplication. */
const TRACKING_PARAMS = /^(utm_[a-z]+|gclid|fbclid|msclkid|mc_cid|mc_eid|_ga|ref)$/i;

/** Paths never crawled: admin, APIs, framework assets, carts, auth. */
export const DEFAULT_EXCLUDED_PREFIXES = [
  "/admin",
  "/api",
  "/_next",
  "/_vercel",
  "/cart",
  "/checkout",
  "/login",
  "/logout",
  "/account",
] as const;

export interface NormalizedUrl {
  url: string; // canonical string form used as the crawl key
  parsed: URL;
  hadQuery: boolean; // a non-tracking query string remained
}

/**
 * Resolves `input` against `base` and returns a stable key:
 * http(s) only, lower-case host, default port removed, fragment removed,
 * tracking parameters removed, remaining parameters sorted.
 * Path case and trailing slashes are kept: they are different URLs, and
 * near-duplicates are reported by the audit rather than silently merged.
 */
export function normalizeUrl(input: string, base?: string): NormalizedUrl | null {
  let u: URL;
  try {
    u = base ? new URL(input.trim(), base) : new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  u.hash = "";
  u.hostname = u.hostname.toLowerCase().replace(/\.$/, "");
  if ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80")) u.port = "";
  const kept = [...u.searchParams.entries()].filter(([k]) => !TRACKING_PARAMS.test(k));
  kept.sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)));
  u.search = "";
  for (const [k, v] of kept) u.searchParams.append(k, v);
  if (!u.pathname) u.pathname = "/";
  return { url: u.toString(), parsed: u, hadQuery: kept.length > 0 };
}

export function isExcludedPath(pathname: string, prefixes: readonly string[] = DEFAULT_EXCLUDED_PREFIXES): boolean {
  const p = pathname.toLowerCase();
  return prefixes.some((prefix) => p === prefix || p.startsWith(prefix.endsWith("/") ? prefix : prefix + "/"));
}

export type ScopeDecision =
  | { ok: true }
  | { ok: false; reason: "external-host" | "protocol" | "excluded-path" | "query-string" | "non-page-asset" };

const ASSET_EXT = /\.(?:png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|mov|mp3|woff2?|ttf|otf|css|js|map|json|pdf|zip|xml|txt)$/i;

/** Decides whether a normalised URL may be queued as a page to crawl. */
export function crawlScope(n: NormalizedUrl, site: URL, excluded: readonly string[] = DEFAULT_EXCLUDED_PREFIXES): ScopeDecision {
  if (n.parsed.protocol !== site.protocol) return { ok: false, reason: "protocol" };
  if (n.parsed.host !== site.host) return { ok: false, reason: "external-host" };
  if (isExcludedPath(n.parsed.pathname, excluded)) return { ok: false, reason: "excluded-path" };
  if (n.hadQuery) return { ok: false, reason: "query-string" };
  if (ASSET_EXT.test(n.parsed.pathname)) return { ok: false, reason: "non-page-asset" };
  return { ok: true };
}

/** Parses and validates the configured production site URL (origin only). */
export function parseSiteUrl(raw: string | undefined | null): URL {
  const u = new URL((raw ?? "").trim());
  if (u.protocol !== "https:") throw new Error("SEO_SITE_URL must use https");
  if (u.username || u.password || u.search || u.hash) throw new Error("SEO_SITE_URL must be a bare origin");
  if (u.pathname !== "/") throw new Error("SEO_SITE_URL must not include a path");
  return new URL(u.origin + "/");
}

/** Accepts a URL entered by a user only if it belongs to the verified site. */
export function toSiteUrl(input: string, site: URL): URL | null {
  const n = normalizeUrl(input, site.origin);
  if (!n) return null;
  if (n.parsed.protocol !== site.protocol || n.parsed.host !== site.host) return null;
  return n.parsed;
}
