import { BadRequest, handle, ok, readJson } from "@/lib/seo/api";
import { validateOverride } from "@/lib/seo/core/metadata";
import { getDb, siteUrl } from "@/lib/seo/server";
import { logAdmin } from "@/lib/seo/services/log";
import { getChange, isEditablePath, publishOverride } from "@/lib/seo/services/metadata";
import { refreshPublicPage } from "@/lib/seo/services/verify";

// Restores the metadata that was live *after* a given change (or before it, with which="before").
export const POST = handle("metadata:publish", async (req, viewer) => {
  const body = await readJson(req);
  if (typeof body.changeId !== "number") throw new BadRequest("changeId is required");
  const db = await getDb();
  const change = await getChange(db, body.changeId);
  if (!change || !isEditablePath(change.path)) throw new BadRequest("Change not found");
  const snapshot = (body.which === "before" ? change.before : change.after) as Record<string, unknown> | null;
  const fields = validateOverride(snapshot ?? {}, siteUrl()); // re-validated against today's rules
  const restored = await publishOverride(db, change.path, fields, viewer.email, Object.keys(fields).length ? "restore" : "reset");
  refreshPublicPage(change.path);
  await logAdmin(db, viewer.email, "metadata_restored", change.path, { fromChange: change.id, version: restored.version });
  return ok({ change: restored }, 201);
});
