CREATE UNIQUE INDEX "ai_task_research_runs_id_task_org_unique" ON "ai_task_research_runs" ("id", "task_id", "organization_id");
ALTER TABLE "ai_task_research_sources" DROP CONSTRAINT "ai_task_research_sources_run_org_fk";
ALTER TABLE "ai_task_research_sources" ADD CONSTRAINT "ai_task_research_sources_run_task_org_fk" FOREIGN KEY ("research_run_id", "task_id", "organization_id") REFERENCES "ai_task_research_runs"("id", "task_id", "organization_id") ON DELETE cascade;
