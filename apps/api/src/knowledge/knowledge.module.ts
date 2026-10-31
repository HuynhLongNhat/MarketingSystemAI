
import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";

import { PermissionsGuard } from "../common/permissions/permissions.guard.js";

import { KnowledgeController } from "./knowledge.controller.js";

import { KnowledgeService } from "./knowledge.service.js";

@Module({
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
