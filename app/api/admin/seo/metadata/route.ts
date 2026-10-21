import { BadRequest, handle, ok, readJson } from "@/lib/seo/api";
import { validateOverride } from "@/lib/seo/core/metadata";
import { getDb, siteUrl } from "@/lib/seo/server";
import { logAdmin } from "@/lib/seo/services/log";
import { isEditablePath, publishOverride } from "@/lib/seo/services/metadata";
import { refreshPublicPage } from "@/lib/seo/services/verify";

// Publishes metadata for one public route. Explicit action only — nothing is published automatically.
export const POST = handle("metadata:publish", async (req, viewer) => {
  const body = await readJson(req);
  const path = typeof body.path === "string" ? body.path : "";
  if (!isEditablePath(path)) throw new BadRequest("That page's metadata cannot be edited from the dashboard");
  if (!body.fields || typeof body.fields !== "object" || Array.isArray(body.fields)) throw new BadRequest("fields must be an object");
  const fields = validateOverride(body.fields as Record<string, unknown>, siteUrl());
  const db = await getDb();
  const change = await publishOverride(db, path, fields, viewer.email);
  refreshPublicPage(path);
  await logAdmin(db, viewer.email, "metadata_published", path, { version: change.version, fields: Object.keys(fields) });
  return ok({ change }, 201);
});
