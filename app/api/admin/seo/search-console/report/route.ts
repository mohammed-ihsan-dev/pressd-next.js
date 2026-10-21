import { handle, ok } from "@/lib/seo/api";
import { gscDeps } from "@/lib/seo/server";
import { connectionView } from "@/lib/seo/services/gsc";
import { buildReport } from "@/lib/seo/services/gsc-report";

export const maxDuration = 60;

export const GET = handle("reports:read", async (req) => {
  const url = new URL(req.url);
  const days = [7, 28, 90].includes(Number(url.searchParams.get("days"))) ? Number(url.searchParams.get("days")) : 28;
  const deps = await gscDeps();
  const conn = await connectionView(deps.db);
  if (conn.state !== "connected") return ok({ connection: conn, report: null });
  const report = await buildReport(deps, conn.propertyUrl, days, url.searchParams.get("refresh") === "1");
  return ok({ connection: conn, report });
});
