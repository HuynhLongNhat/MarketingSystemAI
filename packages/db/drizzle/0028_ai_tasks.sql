CREATE TABLE "ai_tasks" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "created_by" text NOT NULL REFERENCES "user"("id") ON DELETE restrict,
  "title" text NOT NULL, "description" text NOT NULL,
  "status" text NOT NULL DEFAULT 'queued', "connection_id" text, "model_id" text,
  "result" text, "error" text, "generation" text NOT NULL DEFAULT '1',
  "created_at" timestamptz NOT NULL DEFAULT now(), "started_at" timestamptz,
  "completed_at" timestamptz, "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "ai_tasks_org_updated_idx" ON "ai_tasks" ("organization_id", "updated_at");
CREATE INDEX "ai_tasks_org_status_idx" ON "ai_tasks" ("organization_id", "status");
CREATE TABLE "ai_task_events" (
  "id" text PRIMARY KEY NOT NULL, "task_id" text NOT NULL REFERENCES "ai_tasks"("id") ON DELETE cascade,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "type" text NOT NULL, "message" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "ai_task_events_task_created_idx" ON "ai_task_events" ("task_id", "created_at");
