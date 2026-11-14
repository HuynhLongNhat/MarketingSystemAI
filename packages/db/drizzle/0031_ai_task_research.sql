ALTER TABLE "ai_tasks" ADD COLUMN "web_research_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "ai_tasks" ADD COLUMN "research_provider" varchar(64);
ALTER TABLE "ai_tasks" ADD COLUMN "research_policy_version" varchar(64);
CREATE UNIQUE INDEX "ai_tasks_id_org_unique" ON "ai_tasks" ("id", "organization_id");

CREATE TABLE "ai_task_research_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "task_id" text NOT NULL,
  "provider" varchar(64) NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'pending',
  "query_count" integer NOT NULL DEFAULT 0,
  "request_count" integer NOT NULL DEFAULT 0,
  "source_count" integer NOT NULL DEFAULT 0,
  "safe_error_code" varchar(128),
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ai_task_research_runs_task_org_fk" FOREIGN KEY ("task_id", "organization_id") REFERENCES "ai_tasks"("id", "organization_id") ON DELETE cascade
);
CREATE UNIQUE INDEX "ai_task_research_runs_id_org_unique" ON "ai_task_research_runs" ("id", "organization_id");
CREATE INDEX "ai_task_research_runs_org_task_idx" ON "ai_task_research_runs" ("organization_id", "task_id");
CREATE INDEX "ai_task_research_runs_task_status_idx" ON "ai_task_research_runs" ("task_id", "status");

CREATE TABLE "ai_task_research_sources" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "task_id" text NOT NULL,
  "research_run_id" text NOT NULL,
  "ordinal" integer NOT NULL,
  "canonical_url" varchar(2048) NOT NULL,
  "display_url" varchar(2048) NOT NULL,
  "title" varchar(512) NOT NULL,
  "domain" varchar(253) NOT NULL,
  "excerpt" varchar(12000),
  "content_hash" varchar(128),
  "provider_source_id" varchar(512),
  "status" varchar(16) NOT NULL DEFAULT 'pending',
  "retrieved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ai_task_research_sources_task_org_fk" FOREIGN KEY ("task_id", "organization_id") REFERENCES "ai_tasks"("id", "organization_id") ON DELETE cascade,
  CONSTRAINT "ai_task_research_sources_run_org_fk" FOREIGN KEY ("research_run_id", "organization_id") REFERENCES "ai_task_research_runs"("id", "organization_id") ON DELETE cascade
);
CREATE UNIQUE INDEX "ai_task_research_sources_task_ordinal_unique" ON "ai_task_research_sources" ("task_id", "ordinal");
CREATE UNIQUE INDEX "ai_task_research_sources_id_task_org_unique" ON "ai_task_research_sources" ("id", "task_id", "organization_id");
CREATE INDEX "ai_task_research_sources_org_task_idx" ON "ai_task_research_sources" ("organization_id", "task_id");
CREATE INDEX "ai_task_research_sources_run_idx" ON "ai_task_research_sources" ("research_run_id");

CREATE TABLE "ai_task_report_citations" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "task_id" text NOT NULL,
  "source_id" text NOT NULL,
  "citation_number" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ai_task_report_citations_task_org_fk" FOREIGN KEY ("task_id", "organization_id") REFERENCES "ai_tasks"("id", "organization_id") ON DELETE cascade,
  CONSTRAINT "ai_task_report_citations_source_task_org_fk" FOREIGN KEY ("source_id", "task_id", "organization_id") REFERENCES "ai_task_research_sources"("id", "task_id", "organization_id") ON DELETE cascade
);
CREATE UNIQUE INDEX "ai_task_report_citations_task_number_unique" ON "ai_task_report_citations" ("task_id", "citation_number");
CREATE UNIQUE INDEX "ai_task_report_citations_task_source_unique" ON "ai_task_report_citations" ("task_id", "source_id");
CREATE INDEX "ai_task_report_citations_org_task_idx" ON "ai_task_report_citations" ("organization_id", "task_id");
