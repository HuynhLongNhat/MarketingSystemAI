import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentContext } from "../auth/current-context.decorator.js";
import type { RequestContext } from "../auth/request-context.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { RequirePermissions } from "../common/permissions/permissions.decorator.js";
import { PERMISSIONS } from "../common/permissions/permissions.js";

import { PlaygroundChatDto } from "./playground.dto.js";
import { PlaygroundService } from "./playground.service.js";

@ApiTags("Playground")
@Controller("playground")
@UseGuards(AuthGuard, PermissionsGuard)
export class PlaygroundController {
  constructor(private readonly service: PlaygroundService) {}

  @Get("overview")
  @RequirePermissions(PERMISSIONS.AGENT_MANAGE)
  @ApiOperation({
    summary: "Customer support playground configuration overview",
  })
  overview(@CurrentContext() context: RequestContext) {
    return this.service.getOverview(context);
  }

  @Post("chat")
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.AGENT_MANAGE)
  @ApiOperation({
    summary: "Send a test conversation to the customer support agent",
  })
  chat(
    @CurrentContext() context: RequestContext,
    @Body() dto: PlaygroundChatDto,
  ) {
    return this.service.chat(context, dto);
  }
}