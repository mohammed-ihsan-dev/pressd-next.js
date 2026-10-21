import { desc } from "drizzle-orm";
import { handle, ok } from "@/lib/seo/api";
import { auditRuns } from "@/lib/seo/db/schema";
import { getDb, siteUrl } from "@/lib/seo/server";
import { startAudit } from "@/lib/seo/services/audits";
import { logAdmin } from "@/lib/seo/services/log";
import { getSettings } from "@/lib/seo/services/settings";

export const GET = handle("reports:read", async () => {
  const db = await getDb();
  const runs = await db
    .select({ id: auditRuns.id, status: auditRuns.status, startedAt: auditRuns.startedAt, finishedAt: auditRuns.finishedAt, startedBy: auditRuns.startedBy, pagesCrawled: auditRuns.pagesCrawled, issueCounts: auditRuns.issueCounts, error: auditRuns.error })
    .from(auditRuns)
    .orderBy(desc(auditRuns.startedAt))
    .limit(20);
  return ok({ runs });
});

export const POST = handle("audit:run", async (_req, viewer) => {
  const db = await getDb();
  const settings = await getSettings(db);
  const id = await startAudit(db, { site: siteUrl(), actor: viewer.email, limits: settings.crawlLimits, thresholds: settings.thresholds });
  await logAdmin(db, viewer.email, "audit_started", id);
  return ok({ runId: id }, 201);
});
