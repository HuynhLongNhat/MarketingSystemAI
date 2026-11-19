import { Module } from "@nestjs/common";
import { AgentsModule } from "../../agents/agents.module.js";
import { TasksModule } from "../../tasks/tasks.module.js";
import { CeoPlanningModule } from "../../ceo-planning/ceo-planning.module.js";
import { AuthGuard } from "../../auth/auth.guard.js";
import { HadesMcpController } from "./hades-mcp.controller.js";

@Module({
  imports: [AgentsModule, TasksModule, CeoPlanningModule],
  controllers: [HadesMcpController],
  providers: [AuthGuard],
})
export class HadesMcpModule {}
