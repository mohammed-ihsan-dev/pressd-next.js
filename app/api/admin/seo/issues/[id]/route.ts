import { BadRequest, handle, ok, readJson } from "@/lib/seo/api";
import { getDb } from "@/lib/seo/server";
import { ISSUE_STATUSES, setIssueStatus, type IssueStatus } from "@/lib/seo/services/audits";

export const PATCH = handle<RouteContext<"/api/admin/seo/issues/[id]">>("issues:update", async (req, viewer, ctx) => {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequest("Bad issue id");
  const body = await readJson(req);
  const status = body.status;
  if (typeof status !== "string" || !(ISSUE_STATUSES as readonly string[]).includes(status)) throw new BadRequest(`status must be one of ${ISSUE_STATUSES.join(", ")}`);
  const note = typeof body.note === "string" ? body.note.trim() || null : null;
  const issue = await setIssueStatus(await getDb(), id, status as IssueStatus, viewer.email, note);
  return ok({ issue: { id: issue.id, status: issue.status, resolution: issue.resolution } });
});
