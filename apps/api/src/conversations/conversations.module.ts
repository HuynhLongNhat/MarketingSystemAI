import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { JobsModule } from "../jobs/jobs.module.js";

import { ConversationsController } from "./conversations.controller.js";
import { ConversationsRepository } from "./conversations.repository.js";
import { ConversationsService } from "./conversations.service.js";

import { MessagesController } from "./messages.controller.js";
import { MessagesRepository } from "./messages.repository.js";
import { MessagesService } from "./messages.service.js";

import { MessageEnhancementService } from "./message-enhancement.service.js";

import { PlaygroundController } from "./playground.controller.js";
import { PlaygroundService } from "./playground.service.js";

import { PublicWidgetController } from "./public-widget.controller.js";
import { PublicWidgetService } from "./public-widget.service.js";
import { PublicWidgetAiService } from "./public-widget-ai.service.js";
import { AiUsageRecorder } from "./ai-usage-recorder.js";
import { AiUsageQuotaService } from "./ai-usage-quota.service.js";
import { PublicWidgetRateLimitGuard } from "./public-widget-rate-limit.guard.js";
import { PublicWidgetOriginGuard } from "./public-widget-origin.guard.js";

import { HandoffController } from "./handoff.controller.js";
import { HandoffService } from "./handoff.service.js";

@Module({
  imports: [JobsModule],
  controllers: [
    ConversationsController,
    MessagesController,
    PlaygroundController,
    PublicWidgetController,
    HandoffController,
  ],
  providers: [
    ConversationsRepository,
    ConversationsService,
    MessagesRepository,
    MessagesService,
    MessageEnhancementService,
    PlaygroundService,
    PublicWidgetService,
    PublicWidgetAiService,
    AiUsageRecorder,
    AiUsageQuotaService,
    PublicWidgetRateLimitGuard,
    PublicWidgetOriginGuard,
    HandoffService,
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [PublicWidgetService],
})
export class ConversationsModule {}