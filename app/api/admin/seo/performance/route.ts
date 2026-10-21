import { lookup } from "node:dns/promises";
import { BadRequest, handle, ok, readJson } from "@/lib/seo/api";
import { assertSafeTarget } from "@/lib/seo/core/net-guard";
import { toSiteUrl } from "@/lib/seo/core/url";
import { pageSpeedKey } from "@/lib/seo/env";
import { getDb, siteUrl } from "@/lib/seo/server";
import { logAdmin } from "@/lib/seo/services/log";
import { runPageSpeed } from "@/lib/seo/services/performance";

export const maxDuration = 60;

export const POST = handle("performance:run", async (req, viewer) => {
  const body = await readJson(req);
  const site = siteUrl();
  const target = typeof body.url === "string" ? toSiteUrl(body.url, site) : null;
  if (!target) throw new BadRequest(`URL must be a page on ${site.host}`);
  // PSI fetches the URL from Google's side, but we still only allow the verified public host.
  await assertSafeTarget(target, [site.hostname], (h) => lookup(h, { all: true, verbatim: true })).catch(() => {
    throw new BadRequest("That URL is not allowed");
  });
  const strategy = body.strategy === "desktop" ? "desktop" : body.strategy === "mobile" ? "mobile" : null;
  if (!strategy) throw new BadRequest("strategy must be mobile or desktop");
  const db = await getDb();
  const run = await runPageSpeed(db, { url: target.toString(), strategy, actor: viewer.email, apiKey: pageSpeedKey() });
  await logAdmin(db, viewer.email, "pagespeed_run", target.toString(), { strategy, status: run.status });
  return ok({ run }, run.status === "completed" ? 201 : 502);
});
