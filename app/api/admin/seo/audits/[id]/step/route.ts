import { handle, ok } from "@/lib/seo/api";
import { crawlDeps, getDb } from "@/lib/seo/server";
import { stepAudit, STEP_BUDGET_MS } from "@/lib/seo/services/audits";

// Each step crawls for ~20 s and saves progress; the dashboard calls it again until done.
export const maxDuration = 60;

export const POST = handle<RouteContext<"/api/admin/seo/audits/[id]/step">>("audit:run", async (_req, _viewer, ctx) => {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return ok({ error: { code: "invalid", message: "Bad audit id" } }, 400);
  const outcome = await stepAudit(await getDb(), id, crawlDeps(), STEP_BUDGET_MS);
  return ok(outcome);
});
