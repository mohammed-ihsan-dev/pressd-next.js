import { BadRequest, handle, ok, readJson } from "@/lib/seo/api";
import { toSiteUrl } from "@/lib/seo/core/url";
import { gscDeps, siteUrl } from "@/lib/seo/server";
import { cached, connectionView, inspectUrl } from "@/lib/seo/services/gsc";

// URL Inspection has a small daily quota per property, so it is on demand and cached for a day.
export const POST = handle("audit:run", async (req) => {
  const body = await readJson(req);
  const target = typeof body.url === "string" ? toSiteUrl(body.url, siteUrl()) : null;
  if (!target) throw new BadRequest("URL must be on the verified site");
  const deps = await gscDeps();
  const conn = await connectionView(deps.db);
  if (conn.state !== "connected") throw new BadRequest("Search Console is not connected");
  const res = await cached(deps.db, `${conn.propertyUrl}|inspect|${target}`, 24 * 3600_000, () => inspectUrl(deps, target.toString()), body.refresh === true);
  return ok({ url: target.toString(), ...res });
});
