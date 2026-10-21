import "server-only";
// Checks that published metadata actually appears in the live rendered page.

import { revalidatePath } from "next/cache";
import { applyOverride, type MetaOverride } from "../core/metadata.ts";
import { fetchSinglePage, initialState } from "../core/crawler.ts";
import { siteMetadata } from "../../siteMetadata.ts";
import type { Db } from "../db/client.ts";
import { crawlDeps, siteUrl } from "../server.ts";
import { compareRendered, recordVerification } from "./metadata.ts";

/** Expected rendered values: published fields over the code defaults. */
export function expectedFor(fields: MetaOverride) {
  const m = applyOverride(siteMetadata, fields) as { title?: unknown; description?: unknown };
  return {
    title: typeof m.title === "string" ? m.title : undefined,
    description: typeof m.description === "string" ? m.description : undefined,
    canonical: fields.canonical,
    robotsNoindex: fields.robots ? fields.robots.startsWith("noindex") : false,
  };
}

export function refreshPublicPage(path: string) {
  revalidatePath(path);
}

/**
 * Fetches the page from the verified production host and compares. When the
 * dashboard runs somewhere else (e.g. local development) the live site is a
 * different deployment, so a mismatch there is reported as "not yet live"
 * rather than as a failure of the save.
 */
export async function verifyLive(db: Db, changeId: number, path: string, fields: MetaOverride, requestHost: string | null) {
  const site = siteUrl();
  const page = await fetchSinglePage(new URL(path, site).toString(), initialState(site), crawlDeps());
  if (!page.facts || page.status !== 200) {
    const note = `Live page returned ${page.status ?? page.error ?? "no response"}`;
    await recordVerification(db, changeId, false, note);
    return { verified: false, note };
  }
  const mismatches = compareRendered(expectedFor(fields), page.facts);
  const sameDeployment = requestHost === site.host;
  const note = mismatches.length
    ? `${sameDeployment ? "Live page differs" : `Not visible on ${site.host} (this dashboard is running on ${requestHost ?? "another host"}, a different deployment)`}: ${mismatches.join("; ")}`
    : `Confirmed on ${site.host} at ${new Date().toISOString()}`;
  await recordVerification(db, changeId, mismatches.length === 0, note);
  return { verified: mismatches.length === 0, note };
}
