import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";

import { ConversationsController } from "./conversations.controller.js";
import { ConversationsRepository } from "./conversations.repository.js";
import { ConversationsService } from "./conversations.service.js";

@Module({
  controllers: [ConversationsController],
  providers: [
    ConversationsRepository,
    ConversationsService,
    AuthGuard,
    PermissionsGuard,
  ],
})
export class ConversationsModule {}