
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import {
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard.js";

import {
  CurrentContext,
} from "../auth/current-context.decorator.js";

import type {
  RequestContext,
} from "../auth/request-context.js";

import {
  PermissionsGuard,
} from "../common/permissions/permissions.guard.js";

import {
  RequirePermissions,
} from "../common/permissions/permissions.decorator.js";

import {
  PERMISSIONS,
} from "../common/permissions/permissions.js";

import {
  MessagesService,
} from "./messages.service.js";

import {
  MessageEnhancementService,
} from "./message-enhancement.service.js";

import {
  CreateMessageDto,
  ListMessagesQueryDto,
} from "./messages.dto.js";

import {
  EnhanceMessageDto,
} from "./enhance-message.dto.js";

@ApiTags("Messages")
@Controller("conversations/:conversationId/messages")
@UseGuards(AuthGuard, PermissionsGuard)
export class MessagesController {
  constructor(
    private readonly service: MessagesService,
    private readonly enhancementService: MessageEnhancementService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CONVERSATION_READ)
  @ApiOperation({
    summary: "List conversation messages",
  })
  listMessages(
    @CurrentContext() context: RequestContext,
    @Param("conversationId") conversationId: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.service.listMessages(
      context,
      conversationId,
      query,
    );
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CONVERSATION_UPDATE)
  @ApiOperation({
    summary: "Send an operator message",
  })
  createMessage(
    @CurrentContext() context: RequestContext,
    @Param("conversationId") conversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.service.createOperatorMessage(
      context,
      conversationId,
      dto,
    );
  }

  @Post("enhance")
  @RequirePermissions(PERMISSIONS.CONVERSATION_UPDATE)
  @ApiOperation({
    summary: "Enhance operator message with AI",
  })
  async enhanceMessage(
    @CurrentContext() context: RequestContext,
    @Param("conversationId") conversationId: string,
    @Body() dto: EnhanceMessageDto,
  ) {
    // Verify the conversation belongs to the active organization.
    // Also reject requests for missing conversations.
    await this.service.getAccessibleConversation(
      context,
      conversationId,
    );

    return this.enhancementService.enhance(dto.prompt);
  }
}
