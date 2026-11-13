ALTER TABLE "ai_tasks" ADD COLUMN "execution_token" text;
ALTER TABLE "ai_tasks" ADD COLUMN "lease_expires_at" timestamptz;
ALTER TABLE "ai_tasks" ADD COLUMN "attempt_count" integer NOT NULL DEFAULT 0;
CREATE INDEX "ai_tasks_running_lease_idx" ON "ai_tasks" ("organization_id", "status", "lease_expires_at");
