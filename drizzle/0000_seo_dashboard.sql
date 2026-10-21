CREATE TABLE "seo_admin_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target" text,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "seo_audit_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"url" text NOT NULL,
	"status" integer,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "seo_audit_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"url" text NOT NULL,
	"data" jsonb NOT NULL,
	"status" integer,
	"title" text,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_audit_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text NOT NULL,
	"site_url" text NOT NULL,
	"started_by" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"step_lock_until" timestamp with time zone,
	"limits" jsonb NOT NULL,
	"thresholds" jsonb NOT NULL,
	"state" jsonb NOT NULL,
	"pages_crawled" integer DEFAULT 0 NOT NULL,
	"issue_counts" jsonb,
	"summary" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "seo_google_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"google_email" text,
	"scopes" text,
	"refresh_token_enc" text,
	"access_token_enc" text,
	"access_token_expires_at" timestamp with time zone,
	"property_url" text,
	"property_permission" text,
	"status" text NOT NULL,
	"last_error" text,
	"connected_by" text,
	"connected_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_gsc_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_issue_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "seo_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" text NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"explanation" text NOT NULL,
	"fix" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"detected_in_latest_run" boolean DEFAULT true NOT NULL,
	"first_seen_run_id" uuid,
	"last_seen_run_id" uuid,
	"first_detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"resolution" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_metadata_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"version" integer NOT NULL,
	"verified" boolean,
	"verification_note" text
);
--> statement-breakpoint
CREATE TABLE "seo_metadata_overrides" (
	"path" text PRIMARY KEY NOT NULL,
	"fields" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published_by" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_performance_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"strategy" text NOT NULL,
	"requested_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"result" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "seo_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"thresholds" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"crawl_limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_task_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"field" text NOT NULL,
	"from_value" text,
	"to_value" text
);
--> statement-breakpoint
CREATE TABLE "seo_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"url" text,
	"issue_id" uuid,
	"assignee" text,
	"priority" text NOT NULL,
	"status" text NOT NULL,
	"due_date" date,
	"recommendation" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"verification" text DEFAULT 'unverified' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seo_audit_assets" ADD CONSTRAINT "seo_audit_assets_run_id_seo_audit_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."seo_audit_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_audit_pages" ADD CONSTRAINT "seo_audit_pages_run_id_seo_audit_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."seo_audit_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_issue_events" ADD CONSTRAINT "seo_issue_events_issue_id_seo_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."seo_issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_task_events" ADD CONSTRAINT "seo_task_events_task_id_seo_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."seo_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_tasks" ADD CONSTRAINT "seo_tasks_issue_id_seo_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."seo_issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seo_admin_log_at_idx" ON "seo_admin_log" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_audit_assets_run_url" ON "seo_audit_assets" USING btree ("run_id","url");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_audit_pages_run_url" ON "seo_audit_pages" USING btree ("run_id","url");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_audit_runs_one_running" ON "seo_audit_runs" USING btree ("status") WHERE status = 'running';--> statement-breakpoint
CREATE INDEX "seo_audit_runs_started_idx" ON "seo_audit_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "seo_issue_events_issue_idx" ON "seo_issue_events" USING btree ("issue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_issues_fingerprint" ON "seo_issues" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "seo_issues_status_idx" ON "seo_issues" USING btree ("status","severity");--> statement-breakpoint
CREATE INDEX "seo_metadata_changes_path_idx" ON "seo_metadata_changes" USING btree ("path","at");--> statement-breakpoint
CREATE INDEX "seo_perf_url_idx" ON "seo_performance_runs" USING btree ("url","strategy","created_at");--> statement-breakpoint
CREATE INDEX "seo_task_events_task_idx" ON "seo_task_events" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "seo_tasks_status_idx" ON "seo_tasks" USING btree ("status","due_date");