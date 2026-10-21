import { handle, ok, readJson } from "@/lib/seo/api";
import { toSiteUrl } from "@/lib/seo/core/url";
import { getDb, siteUrl } from "@/lib/seo/server";
import { createTask, listTasks } from "@/lib/seo/services/tasks";

const isSiteUrl = (u: string) => !!toSiteUrl(u, siteUrl());

export const GET = handle("reports:read", async (req) => {
  const p = new URL(req.url).searchParams;
  const tasks = await listTasks(await getDb(), {
    status: p.get("status") ?? undefined,
    priority: p.get("priority") ?? undefined,
    assignee: p.get("assignee") ?? undefined,
    q: p.get("q") ?? undefined,
    overdue: p.get("overdue") === "1",
    sort: (["due", "priority", "updated", "created"] as const).find((s) => s === p.get("sort")),
  });
  return ok({ tasks });
});

export const POST = handle("tasks:write", async (req, viewer) => {
  const task = await createTask(await getDb(), await readJson(req), viewer.email, isSiteUrl);
  return ok({ task }, 201);
});
