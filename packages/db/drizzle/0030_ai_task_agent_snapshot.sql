ALTER TABLE "ai_tasks" ADD COLUMN "agent_id" text REFERENCES "ai_agents"("id") ON DELETE SET NULL;
ALTER TABLE "ai_tasks" ADD COLUMN "agent_name" text;
ALTER TABLE "ai_tasks" ADD COLUMN "agent_role" text;
ALTER TABLE "ai_tasks" ADD COLUMN "agent_system_prompt" text;
ALTER TABLE "ai_tasks" ADD COLUMN "agent_connection_id" text;
ALTER TABLE "ai_tasks" ADD COLUMN "agent_model_id" text;
CREATE INDEX "ai_tasks_org_agent_updated_idx" ON "ai_tasks" ("organization_id", "agent_id", "updated_at");
