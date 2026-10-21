import { BadRequest, handle, ok } from "@/lib/seo/api";
import { crawlDeps, getDb } from "@/lib/seo/server";
import { recheckIssue } from "@/lib/seo/services/audits";

export const maxDuration = 60;

export const POST = handle<RouteContext<"/api/admin/seo/issues/[id]/recheck">>("audit:run", async (_req, viewer, ctx) => {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequest("Bad issue id");
  return ok(await recheckIssue(await getDb(), id, viewer.email, crawlDeps()));
});
