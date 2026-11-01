
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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

import { CreateAgentDto, UpdateAgentDto } from "./agents.dto.js";
import { AgentsService } from "./agents.service.js";

@ApiTags("AI Agents")
@Controller("agents")
@UseGuards(AuthGuard, PermissionsGuard)
export class AgentsController {
  constructor(private readonly service: AgentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AGENT_READ)
  @ApiOperation({ summary: "List organization AI agents" })
  list(@CurrentContext() context: RequestContext) {
    return this.service.list(context);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.AGENT_READ)
  @ApiOperation({ summary: "Get AI agent by ID" })
  getById(
    @CurrentContext() context: RequestContext,
    @Param("id") id: string,
  ) {
    return this.service.getById(context, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.AGENT_MANAGE)
  @ApiOperation({ summary: "Create AI agent" })
  create(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateAgentDto,
  ) {
    return this.service.create(context, dto);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.AGENT_MANAGE)
  @ApiOperation({ summary: "Update AI agent" })
  update(
    @CurrentContext() context: RequestContext,
    @Param("id") id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.service.update(context, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.AGENT_MANAGE)
  @ApiOperation({ summary: "Delete AI agent" })
  remove(
    @CurrentContext() context: RequestContext,
    @Param("id") id: string,
  ) {
    return this.service.remove(context, id);
  }
}
