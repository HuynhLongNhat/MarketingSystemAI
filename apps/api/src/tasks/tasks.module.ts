import { Module } from "@nestjs/common";
import { JobsModule } from "../jobs/jobs.module.js";
import { SearchProvidersModule } from "../search-providers/search-providers.module.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { AiUsageQuotaService } from "../conversations/ai-usage-quota.service.js";
import { AiUsageRecorder } from "../conversations/ai-usage-recorder.js";
import { TasksController } from "./tasks.controller.js";
import { TaskAiExecutionService } from "./task-ai-execution.service.js";
import { TasksService } from "./tasks.service.js";

@Module({
  imports: [JobsModule, SearchProvidersModule],
  controllers: [TasksController],
  providers: [TasksService, TaskAiExecutionService, AiUsageRecorder, AiUsageQuotaService, AuthGuard, PermissionsGuard],
  exports: [TasksService, TaskAiExecutionService],
})
export class TasksModule {}
