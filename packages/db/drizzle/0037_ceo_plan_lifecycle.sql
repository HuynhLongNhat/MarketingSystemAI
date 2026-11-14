ALTER TABLE "ceo_plans"
  ADD COLUMN "retry_of_plan_id" text REFERENCES "ceo_plans"("id") ON DELETE restrict,
  ADD COLUMN "retry_plan_id" text,
  ADD COLUMN "retry_started_at" timestamptz,
  ADD COLUMN "retry_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN "deleted_at" timestamptz,
  ADD COLUMN "deleted_by" text REFERENCES "user"("id") ON DELETE restrict;
CREATE UNIQUE INDEX "ceo_plans_retry_of_unique" ON "ceo_plans" ("retry_of_plan_id");
CREATE INDEX "ceo_plans_org_deleted_idx" ON "ceo_plans" ("organization_id", "deleted_at");
