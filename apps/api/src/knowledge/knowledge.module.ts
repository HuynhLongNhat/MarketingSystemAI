
import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";

import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { KnowledgeConnectionsModule } from "../knowledge-connections/knowledge-connections.module.js";

import { KnowledgeController } from "./knowledge.controller.js";

import { KnowledgeService } from "./knowledge.service.js";

@Module({
  imports: [KnowledgeConnectionsModule],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
