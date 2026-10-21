import "server-only";
// Server-side wiring: real database, network and Google dependencies.

import { lookup } from "node:dns/promises";
import type { CrawlDeps } from "./core/crawler.ts";
import { parseKey } from "./core/crypto.ts";
import { getDb } from "./db/client.ts";
import { CRAWLER_USER_AGENT, googleOAuthConfig, siteUrl } from "./env.ts";
import type { GscDeps } from "./services/gsc.ts";

export { getDb };

export function crawlDeps(): CrawlDeps {
  return {
    fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }),
    lookup: (host) => lookup(host, { all: true, verbatim: true }),
    now: () => Date.now(),
    userAgent: CRAWLER_USER_AGENT,
  };
}

export class NotConfiguredError extends Error {
  readonly missing: string[];
  constructor(missing: string[]) {
    super(`Not configured: ${missing.join(", ")}`);
    this.missing = missing;
  }
}

export async function gscDeps(): Promise<GscDeps> {
  const client = googleOAuthConfig();
  const missing: string[] = [];
  if (!client) missing.push("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI");
  let key: Buffer | null = null;
  try {
    key = parseKey(process.env.SEO_TOKEN_ENCRYPTION_KEY);
  } catch {
    missing.push("SEO_TOKEN_ENCRYPTION_KEY");
  }
  if (missing.length) throw new NotConfiguredError(missing);
  return { db: await getDb(), key: key!, client: client! };
}

export function gscMissingConfig(): string[] {
  const missing: string[] = [];
  if (!googleOAuthConfig()) missing.push("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI");
  try {
    parseKey(process.env.SEO_TOKEN_ENCRYPTION_KEY);
  } catch {
    missing.push("SEO_TOKEN_ENCRYPTION_KEY");
  }
  return missing;
}

export { siteUrl };
