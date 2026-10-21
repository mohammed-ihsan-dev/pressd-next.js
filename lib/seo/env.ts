// Server-side configuration for the SEO dashboard. Values are read on demand
// (never at import time) and secrets are never returned to the client —
// `configStatus()` only reports whether each one is present and valid.

import { parseAllowlist } from "./core/permissions.ts";
import { parseSiteUrl } from "./core/url.ts";

export const CRAWLER_USER_AGENT = "Mozilla/5.0 (compatible; PRESSD-SEO-Audit/1.0; +https://www.pressdcafe.ae/)";

export function siteUrl(): URL {
  return parseSiteUrl(process.env.SEO_SITE_URL || "https://www.pressdcafe.ae");
}

export function allowlist() {
  return parseAllowlist(process.env.SEO_ADMIN_USERS);
}

export function googleOAuthConfig(): { clientId: string; clientSecret: string; redirectUri: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function sessionSecret(): string | null {
  const s = process.env.SEO_SESSION_SECRET?.trim();
  return s && s.length >= 32 ? s : null;
}

export function pageSpeedKey(): string | null {
  return process.env.PAGESPEED_INSIGHTS_API_KEY?.trim() || null;
}

export type ConfigCheck = { name: string; required: boolean; ok: boolean; note: string };

/** Presence/validity of each setting — never the values themselves. */
export function configStatus(): ConfigCheck[] {
  const checks: ConfigCheck[] = [];
  let siteNote = "";
  try {
    siteNote = siteUrl().origin + (process.env.SEO_SITE_URL ? "" : " (default)");
  } catch (e) {
    siteNote = e instanceof Error ? e.message : "invalid";
  }
  checks.push({ name: "SEO_SITE_URL", required: false, ok: !siteNote.includes("must"), note: siteNote });
  checks.push({ name: "DATABASE_URL", required: true, ok: !!process.env.DATABASE_URL, note: process.env.DATABASE_URL ? "set" : process.env.NODE_ENV === "production" ? "missing — dashboard data cannot be stored" : "missing — using local development database (.data/)" });
  const al = allowlist();
  checks.push({ name: "SEO_ADMIN_USERS", required: true, ok: al.users.size > 0 && al.errors.length === 0, note: al.users.size ? `${al.users.size} user(s)${al.errors.length ? `; ${al.errors.length} invalid entr${al.errors.length === 1 ? "y" : "ies"}` : ""}` : "no users — nobody can sign in" });
  checks.push({ name: "SEO_SESSION_SECRET", required: true, ok: !!sessionSecret(), note: sessionSecret() ? "set" : "missing or shorter than 32 characters" });
  const g = googleOAuthConfig();
  checks.push({ name: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI", required: true, ok: !!g, note: g ? `redirect URI ${g.redirectUri}` : "incomplete — Google sign-in and Search Console unavailable" });
  let keyNote = "missing — Search Console cannot be connected";
  let keyOk = false;
  const k = process.env.SEO_TOKEN_ENCRYPTION_KEY?.trim();
  if (k) {
    keyOk = Buffer.from(k, "base64").length === 32;
    keyNote = keyOk ? "set (32 bytes)" : "invalid — must be 32 bytes, base64";
  }
  checks.push({ name: "SEO_TOKEN_ENCRYPTION_KEY", required: false, ok: keyOk, note: keyNote });
  checks.push({ name: "PAGESPEED_INSIGHTS_API_KEY", required: false, ok: !!pageSpeedKey(), note: pageSpeedKey() ? "set" : "not set — PageSpeed uses Google's small shared anonymous quota" });
  return checks;
}
