import { handle, ok } from "@/lib/seo/api";
import { gscDeps } from "@/lib/seo/server";
import { disconnect } from "@/lib/seo/services/gsc";
import { logAdmin } from "@/lib/seo/services/log";

export const POST = handle("google:connect", async (_req, viewer) => {
  const deps = await gscDeps();
  const result = await disconnect(deps);
  await logAdmin(deps.db, viewer.email, "gsc_disconnected", null, result);
  return ok(result);
});
