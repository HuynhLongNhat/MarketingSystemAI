
import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";

import { AgentsModule } from "../agents/agents.module.js";

import { AgentTemplatesController } from "./agent-templates.controller.js";
import { AgentTemplatesService } from "./agent-templates.service.js";

@Module({
  imports: [
    AgentsModule,
  ],
  controllers: [
    AgentTemplatesController,
  ],
  providers: [
    AgentTemplatesService,
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [
    AgentTemplatesService,
  ],
})
export class AgentTemplatesModule {}
