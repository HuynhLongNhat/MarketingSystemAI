import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentContext } from "../auth/current-context.decorator.js";
import type { RequestContext } from "../auth/request-context.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { RequirePermissions } from "../common/permissions/permissions.decorator.js";
import { PERMISSIONS } from "../common/permissions/permissions.js";

import { AssignConversationDto } from "./handoff.dto.js";
import { HandoffService } from "./handoff.service.js";

@ApiTags("Human Handoff")
@Controller("conversations")
@UseGuards(AuthGuard, PermissionsGuard)
export class HandoffController {
  constructor(private readonly service: HandoffService) {}

  @Get("handoff/queue")
  @RequirePermissions(PERMISSIONS.CONVERSATION_READ)
  @ApiOperation({ summary: "List escalated conversations" })
  listQueue(
    @CurrentContext() context: RequestContext,
    @Query("filter") filter?: "all" | "unassigned" | "mine",
  ) {
    const normalized =
      filter === "unassigned" || filter === "mine" ? filter : "all";

    return this.service.listQueue(context, normalized);
  }

  @Post(":id/claim")
  @RequirePermissions(PERMISSIONS.CONVERSATION_CLAIM)
  @ApiOperation({ summary: "Claim an unassigned conversation" })
  claim(
    @CurrentContext() context: RequestContext,
    @Param("id") id: string,
  ) {
    return this.service.claim(context, id);
  }

  @Post(":id/assignee")
  @RequirePermissions(PERMISSIONS.CONVERSATION_ASSIGN)
  @ApiOperation({ summary: "Assign a conversation to an organization member" })
  assign(
    @CurrentContext() context: RequestContext,
    @Param("id") id: string,
    @Body() dto: AssignConversationDto,
  ) {
    return this.service.assign(context, id, dto.userId);
  }

  @Delete(":id/assignee")
  @RequirePermissions(PERMISSIONS.CONVERSATION_ASSIGN)
  @ApiOperation({ summary: "Release a conversation assignment" })
  release(
    @CurrentContext() context: RequestContext,
    @Param("id") id: string,
  ) {
    return this.service.release(context, id);
  }
}