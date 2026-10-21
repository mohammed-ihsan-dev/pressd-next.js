// Google Search Console (read-only) — connection storage, token refresh,
// property validation and reporting. Uses only the official APIs:
//   Search Console API v3 (sites, searchAnalytics, sitemaps) and
//   URL Inspection API v1. Nothing here writes to Google.

import { and, eq, gt } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { googleConnections, gscCache } from "../db/schema.ts";
import { decryptSecret, encryptSecret } from "../core/crypto.ts";
import { GoogleAuthError, refreshAccessToken, revokeToken, SEARCH_CONSOLE_SCOPE, type OAuthClient, type TokenResponse } from "../auth/google.ts";

const API = "https://www.googleapis.com/webmasters/v3";
const INSPECT_API = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const ROW_ID = "search_console";
type Fetch = typeof fetch;

export interface GscDeps {
  db: Db;
  key: Buffer; // SEO_TOKEN_ENCRYPTION_KEY
  client: OAuthClient;
  fetch?: Fetch;
  now?: () => Date;
}

export class GscError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = "GscError";
    this.code = code;
    this.status = status;
  }
}

export type ConnectionView =
  | { state: "not_configured"; missing: string[] }
  | { state: "disconnected" }
  | { state: "needs_property"; googleEmail: string | null; connectedBy: string | null; connectedAt: string | null }
  | { state: "connected"; googleEmail: string | null; propertyUrl: string; permission: string | null; connectedBy: string | null; connectedAt: string | null }
  | { state: "error"; googleEmail: string | null; message: string };

/** Public view of the connection — no token material, ever. */
export async function connectionView(db: Db): Promise<ConnectionView> {
  const [row] = await db.select().from(googleConnections).where(eq(googleConnections.id, ROW_ID));
  if (!row || row.status === "disconnected") return { state: "disconnected" };
  if (row.status === "error") return { state: "error", googleEmail: row.googleEmail, message: row.lastError ?? "Unknown error" };
  if (row.status === "needs_property" || !row.propertyUrl) {
    return { state: "needs_property", googleEmail: row.googleEmail, connectedBy: row.connectedBy, connectedAt: row.connectedAt?.toISOString() ?? null };
  }
  return { state: "connected", googleEmail: row.googleEmail, propertyUrl: row.propertyUrl, permission: row.propertyPermission, connectedBy: row.connectedBy, connectedAt: row.connectedAt?.toISOString() ?? null };
}

/** Stores the tokens from the OAuth callback. The property is chosen and validated afterwards. */
export async function storeGrant(deps: GscDeps, tokens: TokenResponse, googleEmail: string, actor: string): Promise<void> {
  const scopes = (tokens.scope ?? "").split(/\s+/);
  if (!scopes.includes(SEARCH_CONSOLE_SCOPE)) {
    throw new GscError("insufficient_scope", "Search Console read access was not granted. Reconnect and leave the Search Console permission ticked.", 400);
  }
  if (!tokens.refresh_token) {
    throw new GscError("no_refresh_token", "Google did not return a refresh token. Remove PRESS'D SEO Studio from your Google account's third-party access, then reconnect.", 400);
  }
  const now = (deps.now ?? (() => new Date()))();
  const values = {
    id: ROW_ID,
    googleEmail,
    scopes: tokens.scope ?? null,
    refreshTokenEnc: encryptSecret(tokens.refresh_token, deps.key, "gsc:refresh"),
    accessTokenEnc: encryptSecret(tokens.access_token, deps.key, "gsc:access"),
    accessTokenExpiresAt: new Date(now.getTime() + tokens.expires_in * 1000),
    propertyUrl: null,
    propertyPermission: null,
    status: "needs_property",
    lastError: null,
    connectedBy: actor,
    connectedAt: now,
    updatedAt: now,
  };
  await deps.db.insert(googleConnections).values(values).onConflictDoUpdate({ target: googleConnections.id, set: values });
  await deps.db.delete(gscCache);
}

async function markError(db: Db, message: string) {
  await db.update(googleConnections).set({ status: "error", lastError: message, accessTokenEnc: null, updatedAt: new Date() }).where(eq(googleConnections.id, ROW_ID));
}

const KEY_MISMATCH = "Stored Google tokens can't be decrypted — SEO_TOKEN_ENCRYPTION_KEY was changed or is wrong. Restore the original key, or reconnect Search Console.";

function decryptOrFlag(db: Db, payload: string, key: Buffer, aad: string): Promise<string> {
  try {
    return Promise.resolve(decryptSecret(payload, key, aad));
  } catch {
    return markError(db, KEY_MISMATCH).then(() => {
      throw new GscError("key_mismatch", KEY_MISMATCH, 409);
    });
  }
}

// One refresh at a time per process: a report fires ~10 parallel queries, and
// without this every one of them would refresh the expired token separately.
let refreshing: Promise<string> | null = null;

/** Returns a valid access token, refreshing it when it is about to expire. */
async function accessToken(deps: GscDeps): Promise<string> {
  const [row] = await deps.db.select().from(googleConnections).where(eq(googleConnections.id, ROW_ID));
  if (!row || row.status === "disconnected" || !row.refreshTokenEnc) throw new GscError("not_connected", "Search Console is not connected", 409);
  if (row.status === "error") throw new GscError("connection_error", row.lastError ?? "Search Console connection needs attention", 409);
  const now = (deps.now ?? (() => new Date()))();
  if (row.accessTokenEnc && row.accessTokenExpiresAt && row.accessTokenExpiresAt.getTime() - now.getTime() > 60_000) {
    return decryptOrFlag(deps.db, row.accessTokenEnc, deps.key, "gsc:access");
  }
  if (refreshing) return refreshing;
  const refreshTokenEnc = row.refreshTokenEnc;
  refreshing = (async () => {
    const refreshToken = await decryptOrFlag(deps.db, refreshTokenEnc, deps.key, "gsc:refresh");
    let refreshed: TokenResponse;
    try {
      refreshed = await refreshAccessToken(deps.client, refreshToken, deps.fetch);
    } catch (e) {
      if (e instanceof GoogleAuthError && e.code === "invalid_grant") {
        await markError(deps.db, "Google access was revoked or has expired. Reconnect Search Console.");
        throw new GscError("invalid_grant", "Google access was revoked or has expired. Reconnect Search Console.", 409);
      }
      throw new GscError("refresh_failed", e instanceof Error ? e.message : "Token refresh failed");
    }
    await deps.db
      .update(googleConnections)
      .set({ accessTokenEnc: encryptSecret(refreshed.access_token, deps.key, "gsc:access"), accessTokenExpiresAt: new Date(now.getTime() + refreshed.expires_in * 1000), updatedAt: now })
      .where(eq(googleConnections.id, ROW_ID));
    return refreshed.access_token;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function call<T>(deps: GscDeps, url: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken(deps);
  const res = await (deps.fetch ?? fetch)(url, {
    ...init,
    headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string; status?: string; errors?: { reason?: string }[] } };
  if (!res.ok) {
    const reason = json.error?.errors?.[0]?.reason ?? json.error?.status ?? "";
    const msg = json.error?.message ?? `Google returned HTTP ${res.status}`;
    if (res.status === 429 || /rateLimit|quota/i.test(reason)) throw new GscError("quota", "Search Console API quota reached. Try again later.", 429);
    if (res.status === 401) throw new GscError("unauthorized", "Google rejected the access token. Reconnect Search Console.", 409);
    if (res.status === 403) throw new GscError("forbidden", `Google denied access: ${msg}`, 403);
    throw new GscError("google_error", msg, 502);
  }
  return json as T;
}

export interface PropertyEntry {
  siteUrl: string;
  permissionLevel: string;
  matchesSite: boolean;
  usable: boolean;
}

/** Search Console property that covers `site`: the domain property, or a URL-prefix property for its origin. */
export function propertyMatchesSite(propertyUrl: string, site: URL): boolean {
  if (propertyUrl.startsWith("sc-domain:")) {
    const domain = propertyUrl.slice("sc-domain:".length).toLowerCase();
    return site.hostname === domain || site.hostname.endsWith("." + domain);
  }
  try {
    const p = new URL(propertyUrl);
    return p.origin === site.origin && p.pathname === "/";
  } catch {
    return false;
  }
}

export async function listProperties(deps: GscDeps, site: URL): Promise<PropertyEntry[]> {
  const data = await call<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>(deps, `${API}/sites`);
  return (data.siteEntry ?? []).map((e) => {
    const matchesSite = propertyMatchesSite(e.siteUrl, site);
    return { ...e, matchesSite, usable: matchesSite && e.permissionLevel !== "siteUnverifiedUser" };
  });
}

/** Validates the chosen property against the live property list before marking the connection usable. */
export async function selectProperty(deps: GscDeps, site: URL, propertyUrl: string): Promise<PropertyEntry> {
  const props = await listProperties(deps, site);
  const entry = props.find((p) => p.siteUrl === propertyUrl);
  if (!entry) throw new GscError("unknown_property", "This Google account has no access to that property.", 400);
  if (!entry.matchesSite) throw new GscError("wrong_property", `That property does not cover ${site.origin}.`, 400);
  if (!entry.usable) throw new GscError("unverified", "This account is not a verified user of that property.", 400);
  await deps.db
    .update(googleConnections)
    .set({ propertyUrl: entry.siteUrl, propertyPermission: entry.permissionLevel, status: "connected", lastError: null, updatedAt: new Date() })
    .where(eq(googleConnections.id, ROW_ID));
  await deps.db.delete(gscCache);
  return entry;
}

export async function disconnect(deps: GscDeps): Promise<{ revoked: boolean }> {
  const [row] = await deps.db.select().from(googleConnections).where(eq(googleConnections.id, ROW_ID));
  let revoked = false;
  if (row?.refreshTokenEnc) {
    try {
      revoked = await revokeToken(decryptSecret(row.refreshTokenEnc, deps.key, "gsc:refresh"), deps.fetch);
    } catch {
      revoked = false;
    }
  }
  await deps.db
    .update(googleConnections)
    .set({ status: "disconnected", refreshTokenEnc: null, accessTokenEnc: null, accessTokenExpiresAt: null, propertyUrl: null, propertyPermission: null, lastError: null, updatedAt: new Date() })
    .where(eq(googleConnections.id, ROW_ID));
  await deps.db.delete(gscCache);
  return { revoked };
}

// ---------------------------------------------------------------- reporting

export type Dimension = "date" | "query" | "page" | "device" | "country";

export interface Row {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Search Console data lags by ~2–3 days and is reported in Pacific Time.
 * Ranges end 3 days before `today` and the comparison period is the
 * preceding range of equal length.
 */
export function rangesFor(days: number, today: Date): { current: DateRange; previous: DateRange } {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 3));
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);
  return { current: { startDate: ymd(start), endDate: ymd(end) }, previous: { startDate: ymd(prevStart), endDate: ymd(prevEnd) } };
}

async function property(deps: GscDeps): Promise<string> {
  const [row] = await deps.db.select().from(googleConnections).where(eq(googleConnections.id, ROW_ID));
  if (!row || row.status !== "connected" || !row.propertyUrl) throw new GscError("not_connected", "Search Console is not connected to a property", 409);
  return row.propertyUrl;
}

export async function querySearchAnalytics(deps: GscDeps, range: DateRange, dimensions: Dimension[], rowLimit = 250): Promise<Row[]> {
  const prop = await property(deps);
  const out: Row[] = [];
  const limit = Math.min(Math.max(rowLimit, 1), 100_000); // total cap; Google pages at 25,000 rows per request
  for (let startRow = 0; out.length < limit; ) {
    const pageSize = Math.min(limit - out.length, 25000);
    const data = await call<{ rows?: Row[] }>(deps, `${API}/sites/${encodeURIComponent(prop)}/searchAnalytics/query`, {
      method: "POST",
      body: JSON.stringify({ ...range, dimensions, rowLimit: pageSize, startRow, type: "web" }),
    });
    const rows = data.rows ?? [];
    out.push(...rows.map((r) => ({ keys: r.keys ?? [], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })));
    if (rows.length < pageSize) break;
    startRow += rows.length;
  }
  return out;
}

export async function listSitemaps(deps: GscDeps) {
  const prop = await property(deps);
  const data = await call<{ sitemap?: Record<string, unknown>[] }>(deps, `${API}/sites/${encodeURIComponent(prop)}/sitemaps`);
  return data.sitemap ?? [];
}

export async function inspectUrl(deps: GscDeps, url: string) {
  const prop = await property(deps);
  const data = await call<{ inspectionResult?: Record<string, unknown> }>(deps, INSPECT_API, {
    method: "POST",
    body: JSON.stringify({ inspectionUrl: url, siteUrl: prop }),
  });
  return data.inspectionResult ?? null;
}

/** Cache wrapper: Search Console data changes at most daily, so results are kept for `ttlMs`. */
export async function cached<T>(db: Db, key: string, ttlMs: number, load: () => Promise<T>, force = false): Promise<{ data: T; fetchedAt: string; fromCache: boolean }> {
  const now = new Date();
  if (!force) {
    const [hit] = await db.select().from(gscCache).where(and(eq(gscCache.key, key), gt(gscCache.expiresAt, now)));
    if (hit) return { data: hit.payload as T, fetchedAt: hit.fetchedAt.toISOString(), fromCache: true };
  }
  const data = await load();
  await db
    .insert(gscCache)
    .values({ key, payload: data as object, fetchedAt: now, expiresAt: new Date(now.getTime() + ttlMs) })
    .onConflictDoUpdate({ target: gscCache.key, set: { payload: data as object, fetchedAt: now, expiresAt: new Date(now.getTime() + ttlMs) } });
  return { data, fetchedAt: now.toISOString(), fromCache: false };
}

export interface Totals {
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
  hasData: boolean;
}

export function totalsOf(rows: Row[]): Totals {
  if (!rows.length) return { clicks: 0, impressions: 0, ctr: null, position: null, hasData: false };
  const r = rows[0];
  return { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position, hasData: true };
}

export interface Change {
  key: string;
  clicks: number;
  prevClicks: number;
  impressions: number;
  prevImpressions: number;
  position: number | null;
  prevPosition: number | null;
  clickChangePct: number;
}

/** Keys that lost at least `minDropPct`% of clicks, considering only keys with ≥ `minPrevClicks` before. */
export function declines(current: Row[], previous: Row[], minPrevClicks = 5, minDropPct = 30): Change[] {
  const cur = new Map(current.map((r) => [r.keys[0], r]));
  const out: Change[] = [];
  for (const p of previous) {
    if (p.clicks < minPrevClicks) continue;
    const c = cur.get(p.keys[0]);
    const clicks = c?.clicks ?? 0;
    const pct = ((clicks - p.clicks) / p.clicks) * 100;
    if (pct <= -minDropPct) {
      out.push({ key: p.keys[0], clicks, prevClicks: p.clicks, impressions: c?.impressions ?? 0, prevImpressions: p.impressions, position: c?.position ?? null, prevPosition: p.position, clickChangePct: Math.round(pct) });
    }
  }
  return out.sort((a, b) => a.clickChangePct - b.clickChangePct || b.prevClicks - a.prevClicks);
}
