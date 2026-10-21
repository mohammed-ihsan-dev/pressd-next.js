import { handle, ok, readJson } from "@/lib/seo/api";
import { getDb } from "@/lib/seo/server";
import { logAdmin } from "@/lib/seo/services/log";
import { saveSettings } from "@/lib/seo/services/settings";

export const PUT = handle("settings:manage", async (req, viewer) => {
  const body = await readJson(req);
  const db = await getDb();
  const settings = await saveSettings(
    db,
    { thresholds: body.thresholds as Record<string, unknown> | undefined, crawlLimits: body.crawlLimits as Record<string, unknown> | undefined },
    viewer.email,
  );
  await logAdmin(db, viewer.email, "settings_saved", null, { thresholds: settings.thresholds, crawlLimits: settings.crawlLimits });
  return ok({ settings });
});
