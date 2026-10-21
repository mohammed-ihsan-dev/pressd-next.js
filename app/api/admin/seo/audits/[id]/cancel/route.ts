import { handle, ok } from "@/lib/seo/api";
import { getDb } from "@/lib/seo/server";
import { cancelAudit } from "@/lib/seo/services/audits";
import { logAdmin } from "@/lib/seo/services/log";

export const POST = handle<RouteContext<"/api/admin/seo/audits/[id]/cancel">>("audit:run", async (_req, viewer, ctx) => {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return ok({ error: { code: "invalid", message: "Bad audit id" } }, 400);
  const db = await getDb();
  const cancelled = await cancelAudit(db, id);
  if (cancelled) await logAdmin(db, viewer.email, "audit_cancelled", id);
  return ok({ cancelled });
});
