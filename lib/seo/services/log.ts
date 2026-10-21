import type { Db } from "../db/client.ts";
import { adminLog } from "../db/schema.ts";

/** Records a security-relevant admin action. Never pass tokens or secrets in `details`. */
export async function logAdmin(db: Db, actor: string, action: string, target: string | null = null, details: Record<string, unknown> | null = null) {
  try {
    await db.insert(adminLog).values({ actor, action, target, details });
  } catch (e) {
    console.error("[seo] failed to write admin log", action, e instanceof Error ? e.message : e);
  }
}
