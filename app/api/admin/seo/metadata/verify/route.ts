import { BadRequest, handle, ok, readJson } from "@/lib/seo/api";
import type { MetaOverride } from "@/lib/seo/core/metadata";
import { getDb } from "@/lib/seo/server";
import { getChange } from "@/lib/seo/services/metadata";
import { verifyLive } from "@/lib/seo/services/verify";

export const maxDuration = 30;

export const POST = handle("metadata:publish", async (req) => {
  const body = await readJson(req);
  if (typeof body.changeId !== "number") throw new BadRequest("changeId is required");
  const db = await getDb();
  const change = await getChange(db, body.changeId);
  if (!change) throw new BadRequest("Change not found");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return ok(await verifyLive(db, change.id, change.path, (change.after ?? {}) as MetaOverride, host));
});
