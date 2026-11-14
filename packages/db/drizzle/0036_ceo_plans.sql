CREATE TABLE "ceo_plans" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "created_by" text NOT NULL REFERENCES "user"("id") ON DELETE restrict,
  "ceo_agent_id" text NOT NULL REFERENCES "ai_agents"("id") ON DELETE restrict,
  "task_id" text NOT NULL REFERENCES "ai_tasks"("id") ON DELETE restrict,
  "title" varchar(200) NOT NULL,
  "objective" text NOT NULL,
  "approval_status" varchar(16) NOT NULL DEFAULT 'pending',
  "decision_note" text,
  "decided_by" text REFERENCES "user"("id") ON DELETE restrict,
  "decided_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "ceo_plans_task_unique" ON "ceo_plans" ("task_id");
CREATE INDEX "ceo_plans_org_created_idx" ON "ceo_plans" ("organization_id", "created_at");
CREATE INDEX "ceo_plans_org_status_idx" ON "ceo_plans" ("organization_id", "approval_status");
