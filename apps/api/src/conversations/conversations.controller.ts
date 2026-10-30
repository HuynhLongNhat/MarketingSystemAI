
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import {
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentContext } from "../auth/current-context.decorator.js";
import type { RequestContext } from "../auth/request-context.js";

import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { RequirePermissions } from "../common/permissions/permissions.decorator.js";
import { PERMISSIONS } from "../common/permissions/permissions.js";

import { ConversationsService } from "./conversations.service.js";

import {
  CreateContactSessionDto,
  CreateConversationDto,
  UpdateConversationStatusDto,
  ListConversationsQueryDto,
} from "./conversations.dto.js";

@ApiTags("Conversations")
@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class ConversationsController {
  constructor(
    private readonly service: ConversationsService,
  ) {}

  // -----------------------------------------
  // CONTACT SESSIONS
  // -----------------------------------------

  @Get("contact-sessions")
  @RequirePermissions(PERMISSIONS.CONVERSATION_READ)
  @ApiOperation({
    summary: "List contact sessions",
  })
  listContactSessions(
    @CurrentContext() ctx: RequestContext,
  ) {
    return this.service.listContactSessions(ctx);
  }

  @Post("contact-sessions")
  @RequirePermissions(PERMISSIONS.CONVERSATION_UPDATE)
  @ApiOperation({
    summary: "Create contact session",
  })
  createContactSession(
    @CurrentContext() ctx: RequestContext,
    @Body() dto: CreateContactSessionDto,
  ) {
    return this.service.createContactSession(ctx, dto);
  }

  // -----------------------------------------
  // CONVERSATIONS
  // -----------------------------------------

  @Get("conversations")
  @RequirePermissions(PERMISSIONS.CONVERSATION_READ)
  @ApiOperation({
    summary: "List conversations",
  })
  listConversations(
    @CurrentContext() ctx: RequestContext,
  ) {
    return this.service.listConversations(ctx);
  }

  // Phân trang, lọc trạng thái
  // Phải đặt trước route conversations/:id
  @Get("conversations/page")
  @RequirePermissions(PERMISSIONS.CONVERSATION_READ)
  @ApiOperation({
    summary: "List paginated conversations",
  })
  listConversationPage(
    @CurrentContext() ctx: RequestContext,
    @Query() query: ListConversationsQueryDto,
  ) {
    return this.service.listConversationPage(ctx, query);
  }

  @Get("conversations/:id")
  @RequirePermissions(PERMISSIONS.CONVERSATION_READ)
  @ApiOperation({
    summary: "Get conversation",
  })
  getConversation(
    @CurrentContext() ctx: RequestContext,
    @Param("id") id: string,
  ) {
    return this.service.getConversation(ctx, id);
  }

  // Lấy thông tin khách hàng theo conversation
  @Get("conversations/:id/contact-session")
  @RequirePermissions(PERMISSIONS.CONVERSATION_READ)
  @ApiOperation({
    summary: "Get contact session by conversation",
  })
  getContactSessionByConversation(
    @CurrentContext() ctx: RequestContext,
    @Param("id") id: string,
  ) {
    return this.service.getContactSessionByConversation(
      ctx,
      id,
    );
  }

  @Post("conversations")
  @RequirePermissions(PERMISSIONS.CONVERSATION_UPDATE)
  @ApiOperation({
    summary: "Create conversation",
  })
  createConversation(
    @CurrentContext() ctx: RequestContext,
    @Body() dto: CreateConversationDto,
  ) {
    return this.service.createConversation(ctx, dto);
  }

  @Patch("conversations/:id/status")
  @RequirePermissions(PERMISSIONS.CONVERSATION_UPDATE)
  @ApiOperation({
    summary: "Update conversation status",
  })
  updateStatus(
    @CurrentContext() ctx: RequestContext,
    @Param("id") id: string,
    @Body() dto: UpdateConversationStatusDto,
  ) {
    return this.service.updateStatus(ctx, id, dto);
  }
}
