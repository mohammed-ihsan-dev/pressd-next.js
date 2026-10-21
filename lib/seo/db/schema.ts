// SEO dashboard tables (Postgres via Drizzle). Kept separate from the public
// site, which has no database. Secrets are only ever stored encrypted.

import { sql } from "drizzle-orm";
import { boolean, date, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });

/** Single row (id = "default"): dashboard configuration editable by admins. */
export const seoSettings = pgTable("seo_settings", {
  id: text("id").primaryKey(),
  thresholds: jsonb("thresholds").$type<Record<string, number>>().notNull().default({}),
  crawlLimits: jsonb("crawl_limits").$type<Record<string, number>>().notNull().default({}),
  updatedBy: text("updated_by"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** Search Console connection (one row, id = "search_console"). Tokens are AES-256-GCM ciphertext. */
export const googleConnections = pgTable("seo_google_connections", {
  id: text("id").primaryKey(),
  googleEmail: text("google_email"),
  scopes: text("scopes"),
  refreshTokenEnc: text("refresh_token_enc"),
  accessTokenEnc: text("access_token_enc"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  propertyUrl: text("property_url"),
  propertyPermission: text("property_permission"),
  status: text("status").notNull(), // connected | needs_property | error | disconnected
  lastError: text("last_error"),
  connectedBy: text("connected_by"),
  connectedAt: ts("connected_at"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const auditRuns = pgTable(
  "seo_audit_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: text("status").notNull(), // running | completed | failed | cancelled
    siteUrl: text("site_url").notNull(),
    startedBy: text("started_by").notNull(),
    startedAt: ts("started_at").notNull().defaultNow(),
    finishedAt: ts("finished_at"),
    heartbeatAt: ts("heartbeat_at").notNull().defaultNow(),
    stepLockUntil: ts("step_lock_until"), // a step in progress holds this; prevents overlapping steps
    limits: jsonb("limits").notNull(),
    thresholds: jsonb("thresholds").notNull(),
    state: jsonb("state").notNull(),
    pagesCrawled: integer("pages_crawled").notNull().default(0),
    issueCounts: jsonb("issue_counts"),
    summary: jsonb("summary"),
    error: text("error"),
  },
  (t) => [
    // At most one running audit: a second insert fails atomically.
    uniqueIndex("seo_audit_runs_one_running").on(t.status).where(sql`status = 'running'`),
    index("seo_audit_runs_started_idx").on(t.startedAt),
  ],
);

export const auditPages = pgTable(
  "seo_audit_pages",
  {
    id: serial("id").primaryKey(),
    runId: uuid("run_id").notNull().references(() => auditRuns.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    data: jsonb("data").notNull(), // FetchedPage
    status: integer("status"),
    title: text("title"),
    fetchedAt: ts("fetched_at").notNull(),
  },
  (t) => [uniqueIndex("seo_audit_pages_run_url").on(t.runId, t.url)],
);

export const auditAssets = pgTable(
  "seo_audit_assets",
  {
    id: serial("id").primaryKey(),
    runId: uuid("run_id").notNull().references(() => auditRuns.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    status: integer("status"),
    error: text("error"),
  },
  (t) => [uniqueIndex("seo_audit_assets_run_url").on(t.runId, t.url)],
);

/** Issues persist across runs (matched by fingerprint) so status and history survive re-audits. */
export const issues = pgTable(
  "seo_issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fingerprint: text("fingerprint").notNull(),
    type: text("type").notNull(),
    severity: text("severity").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    explanation: text("explanation").notNull(),
    fix: text("fix").notNull(),
    evidence: jsonb("evidence").notNull(),
    status: text("status").notNull().default("open"), // open | assigned | fixed | ignored
    detectedInLatestRun: boolean("detected_in_latest_run").notNull().default(true),
    firstSeenRunId: uuid("first_seen_run_id"),
    lastSeenRunId: uuid("last_seen_run_id"),
    firstDetectedAt: ts("first_detected_at").notNull().defaultNow(),
    lastDetectedAt: ts("last_detected_at").notNull().defaultNow(),
    lastCheckedAt: ts("last_checked_at").notNull().defaultNow(),
    resolvedAt: ts("resolved_at"),
    resolvedBy: text("resolved_by"),
    resolution: text("resolution"), // user_confirmed | verified_recheck | ignored
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("seo_issues_fingerprint").on(t.fingerprint),
    index("seo_issues_status_idx").on(t.status, t.severity),
  ],
);

export const issueEvents = pgTable(
  "seo_issue_events",
  {
    id: serial("id").primaryKey(),
    issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
    at: ts("at").notNull().defaultNow(),
    actor: text("actor").notNull(), // email or "audit"
    action: text("action").notNull(), // detected | redetected | status | recheck | not_detected
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    note: text("note"),
  },
  (t) => [index("seo_issue_events_issue_idx").on(t.issueId)],
);

export const performanceRuns = pgTable(
  "seo_performance_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    strategy: text("strategy").notNull(), // mobile | desktop
    requestedBy: text("requested_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    status: text("status").notNull(), // completed | failed
    result: jsonb("result"), // normalised PSI result
    error: text("error"),
  },
  (t) => [index("seo_perf_url_idx").on(t.url, t.strategy, t.createdAt)],
);

/** Cached Search Console API responses (reporting only). */
export const gscCache = pgTable("seo_gsc_cache", {
  key: text("key").primaryKey(),
  payload: jsonb("payload").notNull(),
  fetchedAt: ts("fetched_at").notNull().defaultNow(),
  expiresAt: ts("expires_at").notNull(),
});

export const tasks = pgTable(
  "seo_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    url: text("url"),
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
    assignee: text("assignee"),
    priority: text("priority").notNull(), // urgent | high | normal | low
    status: text("status").notNull(), // todo | in_progress | blocked | done
    dueDate: date("due_date"),
    recommendation: text("recommendation").notNull().default(""),
    notes: text("notes").notNull().default(""),
    verification: text("verification").notNull().default("unverified"), // unverified | verified_fixed | not_fixed
    createdBy: text("created_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("seo_tasks_status_idx").on(t.status, t.dueDate)],
);

export const taskEvents = pgTable(
  "seo_task_events",
  {
    id: serial("id").primaryKey(),
    taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    at: ts("at").notNull().defaultNow(),
    actor: text("actor").notNull(),
    field: text("field").notNull(),
    fromValue: text("from_value"),
    toValue: text("to_value"),
  },
  (t) => [index("seo_task_events_task_idx").on(t.taskId)],
);

/** Published metadata overrides for public routes (read by the site's generateMetadata). */
export const metadataOverrides = pgTable("seo_metadata_overrides", {
  path: text("path").primaryKey(),
  fields: jsonb("fields").$type<Record<string, string>>().notNull(),
  version: integer("version").notNull().default(1),
  publishedBy: text("published_by").notNull(),
  publishedAt: ts("published_at").notNull().defaultNow(),
});

export const metadataChanges = pgTable(
  "seo_metadata_changes",
  {
    id: serial("id").primaryKey(),
    path: text("path").notNull(),
    at: ts("at").notNull().defaultNow(),
    actor: text("actor").notNull(),
    action: text("action").notNull(), // publish | restore | reset
    before: jsonb("before"),
    after: jsonb("after"),
    version: integer("version").notNull(),
    verified: boolean("verified"),
    verificationNote: text("verification_note"),
  },
  (t) => [index("seo_metadata_changes_path_idx").on(t.path, t.at)],
);

/** Security-relevant admin actions. Never contains tokens or secrets. */
export const adminLog = pgTable(
  "seo_admin_log",
  {
    id: serial("id").primaryKey(),
    at: ts("at").notNull().defaultNow(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    target: text("target"),
    details: jsonb("details"),
  },
  (t) => [index("seo_admin_log_at_idx").on(t.at)],
);
