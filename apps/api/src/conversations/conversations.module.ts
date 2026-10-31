
import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";

import { ConversationsController } from "./conversations.controller.js";
import { ConversationsRepository } from "./conversations.repository.js";
import { ConversationsService } from "./conversations.service.js";

import { MessagesController } from "./messages.controller.js";
import { MessagesRepository } from "./messages.repository.js";
import { MessagesService } from "./messages.service.js";

import { MessageEnhancementService } from "./message-enhancement.service.js";

import { PublicWidgetController } from "./public-widget.controller.js";
import { PublicWidgetService } from "./public-widget.service.js";
import { PublicWidgetAiService } from "./public-widget-ai.service.js";
import { PublicWidgetRateLimitGuard } from "./public-widget-rate-limit.guard.js";

@Module({
  controllers: [
    ConversationsController,
    MessagesController,
    PublicWidgetController,
  ],
  providers: [
    ConversationsRepository,
    ConversationsService,
    MessagesRepository,
    MessagesService,
    MessageEnhancementService,
    PublicWidgetService,
    PublicWidgetAiService,
    PublicWidgetRateLimitGuard,
    AuthGuard,
    PermissionsGuard,
  ],
})
export class ConversationsModule {}
