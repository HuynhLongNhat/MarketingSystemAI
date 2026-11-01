
import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";

import { AgentsController } from "./agents.controller.js";
import { AgentsService } from "./agents.service.js";

import { SupportAssignmentController } from "./support-assignment.controller.js";
import { SupportAssignmentService } from "./support-assignment.service.js";

@Module({
  controllers: [
    AgentsController,
    SupportAssignmentController,
  ],
  providers: [
    AgentsService,
    SupportAssignmentService,
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [
    AgentsService,
    SupportAssignmentService,
  ],
})
export class AgentsModule {}
