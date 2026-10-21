import type { Metadata } from "next";
import { inArray } from "drizzle-orm";
import DbMissing from "@/components/seo/DbMissing";
import PageHead from "@/components/seo/PageHead";
import TasksPanel, { type TaskRow } from "@/components/seo/TasksPanel";
import { requirePage } from "@/lib/seo/auth/guard";
import { can } from "@/lib/seo/core/permissions";
import { issues } from "@/lib/seo/db/schema";
import { dbOrNull } from "@/lib/seo/page-data";
import { listTasks, taskHistory } from "@/lib/seo/services/tasks";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const viewer = await requirePage("reports:read");
  const db = await dbOrNull();
  if (!db) return (<><PageHead eyebrow="SEO Studio" title="Tasks" /><DbMissing /></>);
  const list = await listTasks(db, { limit: 500 });
  const hist = await taskHistory(db, list.map((t) => t.id));
  const issueIds = [...new Set(list.map((t) => t.issueId).filter(Boolean))] as string[];
  const linked = issueIds.length ? await db.select({ id: issues.id, title: issues.title }).from(issues).where(inArray(issues.id, issueIds)) : [];
  const rows: TaskRow[] = list.map((t) => ({
    id: t.id, title: t.title, description: t.description, url: t.url, issueId: t.issueId, issueTitle: linked.find((i) => i.id === t.issueId)?.title ?? null,
    assignee: t.assignee, priority: t.priority, status: t.status, dueDate: t.dueDate, recommendation: t.recommendation, notes: t.notes, verification: t.verification,
    createdBy: t.createdBy, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
    history: hist.filter((h) => h.taskId === t.id).map((h) => ({ at: h.at.toISOString(), actor: h.actor, field: h.field, fromValue: h.fromValue, toValue: h.toValue })),
  }));
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  return (
    <>
      <PageHead eyebrow="SEO Studio" title="Tasks" lede="SEO work items, linked to audit issues where relevant. Marking a task done does not close its issue — use Recheck on the audit page to verify the fix on the live site." />
      <TasksPanel tasks={rows} canWrite={can(viewer.role, "tasks:write")} today={today} />
    </>
  );
}
