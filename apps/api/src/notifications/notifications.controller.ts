
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";

import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentContext } from "../auth/current-context.decorator.js";
import type { RequestContext } from "../auth/request-context.js";

import { NotificationsService } from "./notifications.service.js";

@ApiTags("Notifications")
@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List current user's notifications",
  })
  list(
    @CurrentContext() context: RequestContext,
    @Query("limit") rawLimit?: string,
  ) {
    const limit = rawLimit === undefined
      ? 30
      : Number(rawLimit);

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new BadRequestException(
        "limit must be between 1 and 100",
      );
    }

    return this.service.list(context, limit);
  }

  @Patch("read-all")
  @ApiOperation({
    summary: "Mark all notifications as read",
  })
  markAllRead(
    @CurrentContext() context: RequestContext,
  ) {
    return this.service.markAllRead(context);
  }

  @Patch(":id/read")
  @ApiOperation({
    summary: "Mark notification as read",
  })
  markRead(
    @CurrentContext() context: RequestContext,
    @Param("id") id: string,
  ) {
    return this.service.markRead(context, id);
  }
}
