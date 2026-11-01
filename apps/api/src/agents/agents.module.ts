
import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";

import { AgentsController } from "./agents.controller.js";
import { AgentsService } from "./agents.service.js";

@Module({
  controllers: [AgentsController],
  providers: [
    AgentsService,
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [AgentsService],
})
export class AgentsModule {}
