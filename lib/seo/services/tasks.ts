// SEO task workflow with field-level history.

import { and, asc, desc, eq, ilike, inArray, lt, ne, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { issues, taskEvents, tasks } from "../db/schema.ts";

export const TASK_STATUSES = ["todo", "in_progress", "blocked", "done"] as const;
export const TASK_PRIORITIES = ["urgent", "high", "normal", "low"] as const;
export const VERIFICATIONS = ["unverified", "verified_fixed", "not_fixed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export class TaskValidationError extends Error {}

export interface TaskInput {
  title?: unknown;
  description?: unknown;
  url?: unknown;
  issueId?: unknown;
  assignee?: unknown;
  priority?: unknown;
  status?: unknown;
  dueDate?: unknown;
  recommendation?: unknown;
  notes?: unknown;
  verification?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(v: unknown, field: string, max: number, required = false): string {
  if (v === undefined || v === null) {
    if (required) throw new TaskValidationError(`${field} is required`);
    return "";
  }
  if (typeof v !== "string") throw new TaskValidationError(`${field} must be text`);
  const s = v.trim();
  if (required && !s) throw new TaskValidationError(`${field} is required`);
  if (s.length > max) throw new TaskValidationError(`${field} must be at most ${max} characters`);
  return s;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) throw new TaskValidationError(`${field} must be one of ${allowed.join(", ")}`);
  return v as T;
}

/** Validates a create (full) or update (partial) payload into column values. */
export function validateTask(input: TaskInput, partial: boolean, isSiteUrl: (u: string) => boolean) {
  const out: Partial<typeof tasks.$inferInsert> = {};
  const has = (k: keyof TaskInput) => !partial || input[k] !== undefined;
  if (has("title")) out.title = text(input.title, "Title", 200, true);
  if (has("description")) out.description = text(input.description, "Description", 5000);
  if (has("recommendation")) out.recommendation = text(input.recommendation, "Recommendation", 5000);
  if (has("notes")) out.notes = text(input.notes, "Implementation notes", 10000);
  if (has("url")) {
    const u = text(input.url, "URL", 2000);
    if (u && !isSiteUrl(u)) throw new TaskValidationError("URL must be a page on the PRESS'D website");
    out.url = u || null;
  }
  if (has("assignee")) {
    const a = text(input.assignee, "Assignee", 320).toLowerCase();
    if (a && !EMAIL_RE.test(a)) throw new TaskValidationError("Assignee must be an email address");
    out.assignee = a || null;
  }
  if (has("priority")) out.priority = oneOf(input.priority ?? "normal", TASK_PRIORITIES, "Priority");
  if (has("status")) out.status = oneOf(input.status ?? "todo", TASK_STATUSES, "Status");
  if (has("verification")) out.verification = oneOf(input.verification ?? "unverified", VERIFICATIONS, "Verification");
  if (has("dueDate")) {
    const d = text(input.dueDate, "Due date", 10);
    if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d + "T00:00:00Z")))) throw new TaskValidationError("Due date must be YYYY-MM-DD");
    out.dueDate = d || null;
  }
  if (has("issueId")) {
    const id = text(input.issueId, "Issue", 64);
    if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new TaskValidationError("Invalid issue reference");
    out.issueId = id || null;
  }
  return out;
}

export async function createTask(db: Db, input: TaskInput, actor: string, isSiteUrl: (u: string) => boolean) {
  const v = validateTask(input, false, isSiteUrl);
  if (v.issueId) {
    const [iss] = await db.select({ id: issues.id }).from(issues).where(eq(issues.id, v.issueId));
    if (!iss) throw new TaskValidationError("Linked issue not found");
  }
  const [row] = await db
    .insert(tasks)
    .values({ ...(v as typeof tasks.$inferInsert), createdBy: actor })
    .returning();
  await db.insert(taskEvents).values({ taskId: row.id, actor, field: "created", toValue: row.title });
  // linking a task assigns the issue
  if (row.issueId) await db.update(issues).set({ status: "assigned", updatedAt: new Date() }).where(and(eq(issues.id, row.issueId), eq(issues.status, "open")));
  return row;
}

export async function updateTask(db: Db, id: string, input: TaskInput, actor: string, isSiteUrl: (u: string) => boolean) {
  const [cur] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!cur) throw new TaskValidationError("Task not found");
  const v = validateTask(input, true, isSiteUrl);
  const changes = Object.entries(v).filter(([k, val]) => String(cur[k as keyof typeof cur] ?? "") !== String(val ?? ""));
  if (!changes.length) return cur;
  const [row] = await db.update(tasks).set({ ...v, updatedAt: new Date() }).where(eq(tasks.id, id)).returning();
  await db.insert(taskEvents).values(
    changes.map(([field, val]) => ({
      taskId: id,
      actor,
      field,
      fromValue: field === "notes" || field === "description" || field === "recommendation" ? null : String(cur[field as keyof typeof cur] ?? ""),
      toValue: field === "notes" || field === "description" || field === "recommendation" ? "(edited)" : String(val ?? ""),
    })),
  );
  return row;
}

export interface TaskFilter {
  status?: string;
  priority?: string;
  assignee?: string;
  q?: string;
  overdue?: boolean;
  sort?: "due" | "priority" | "updated" | "created";
  limit?: number;
}

export async function listTasks(db: Db, f: TaskFilter, today = new Date().toISOString().slice(0, 10)) {
  const where: SQL[] = [];
  if (f.status && (TASK_STATUSES as readonly string[]).includes(f.status)) where.push(eq(tasks.status, f.status));
  if (f.status === "open") where.push(ne(tasks.status, "done"));
  if (f.priority && (TASK_PRIORITIES as readonly string[]).includes(f.priority)) where.push(eq(tasks.priority, f.priority));
  if (f.assignee) where.push(eq(tasks.assignee, f.assignee.toLowerCase()));
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, (m) => "\\" + m).slice(0, 100)}%`;
    where.push(or(ilike(tasks.title, like), ilike(tasks.url, like), ilike(tasks.description, like))!);
  }
  if (f.overdue) where.push(and(ne(tasks.status, "done"), lt(tasks.dueDate, today))!);
  const priorityOrder = sql`CASE ${tasks.priority} WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END`;
  const order =
    f.sort === "priority" ? [asc(priorityOrder), asc(tasks.dueDate)] :
    f.sort === "updated" ? [desc(tasks.updatedAt)] :
    f.sort === "created" ? [desc(tasks.createdAt)] :
    [sql`${tasks.dueDate} IS NULL`, asc(tasks.dueDate), asc(priorityOrder)];
  return db
    .select()
    .from(tasks)
    .where(where.length ? and(...where) : undefined)
    .orderBy(...order)
    .limit(Math.min(f.limit ?? 200, 500));
}

export async function taskHistory(db: Db, ids: string[]) {
  if (!ids.length) return [];
  return db.select().from(taskEvents).where(inArray(taskEvents.taskId, ids)).orderBy(desc(taskEvents.at)).limit(1000);
}
