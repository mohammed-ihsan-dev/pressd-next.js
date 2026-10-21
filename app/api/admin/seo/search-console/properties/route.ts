import { BadRequest, handle, ok, readJson } from "@/lib/seo/api";
import { gscDeps, siteUrl } from "@/lib/seo/server";
import { listProperties, selectProperty } from "@/lib/seo/services/gsc";
import { logAdmin } from "@/lib/seo/services/log";

export const GET = handle("google:connect", async () => {
  return ok({ properties: await listProperties(await gscDeps(), siteUrl()) });
});

export const POST = handle("google:connect", async (req, viewer) => {
  const body = await readJson(req);
  if (typeof body.propertyUrl !== "string" || body.propertyUrl.length > 300) throw new BadRequest("propertyUrl is required");
  const deps = await gscDeps();
  const entry = await selectProperty(deps, siteUrl(), body.propertyUrl);
  await logAdmin(deps.db, viewer.email, "gsc_property_selected", entry.siteUrl, { permission: entry.permissionLevel });
  return ok({ property: entry });
});
