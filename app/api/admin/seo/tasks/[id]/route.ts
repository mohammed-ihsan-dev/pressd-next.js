import { BadRequest, handle, ok, readJson } from "@/lib/seo/api";
import { toSiteUrl } from "@/lib/seo/core/url";
import { getDb, siteUrl } from "@/lib/seo/server";
import { updateTask } from "@/lib/seo/services/tasks";

export const PATCH = handle<RouteContext<"/api/admin/seo/tasks/[id]">>("tasks:write", async (req, viewer, ctx) => {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequest("Bad task id");
  const task = await updateTask(await getDb(), id, await readJson(req), viewer.email, (u) => !!toSiteUrl(u, siteUrl()));
  return ok({ task });
});
