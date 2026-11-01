
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

import {
  CreateAgentTemplateDto,
  UpdateAgentTemplateDto,
} from "./agent-templates.dto.js";

import { CreateAgentFromTemplateDto } from "./create-agent-from-template.dto.js";
import { AgentTemplatesService } from "./agent-templates.service.js";

@ApiTags("Agent Templates")
@Controller("agent-templates")
@UseGuards(
  AuthGuard,
  PermissionsGuard,
)
export class AgentTemplatesController {
  constructor(
    private readonly service: AgentTemplatesService,
  ) {}

  @Get()
  @RequirePermissions(
    PERMISSIONS.AGENT_READ,
  )
  @ApiOperation({
    summary: "List available agent templates",
  })
  list(
    @CurrentContext()
    context: RequestContext,
  ) {
    return this.service.list(
      context,
    );
  }

  @Get(":id")
  @RequirePermissions(
    PERMISSIONS.AGENT_READ,
  )
  @ApiOperation({
    summary: "Get agent template",
  })
  getById(
    @CurrentContext()
    context: RequestContext,
    @Param("id") id: string,
  ) {
    return this.service.getById(
      context,
      id,
    );
  }

  @Post()
  @RequirePermissions(
    PERMISSIONS.AGENT_MANAGE,
  )
  @ApiOperation({
    summary: "Create agent template",
  })
  create(
    @CurrentContext()
    context: RequestContext,
    @Body() dto: CreateAgentTemplateDto,
  ) {
    return this.service.create(
      context,
      dto,
    );
  }

  @Post(":id/create-agent")
  @RequirePermissions(
    PERMISSIONS.AGENT_MANAGE,
  )
  @ApiOperation({
    summary: "Create AI agent from template",
  })
  createAgentFromTemplate(
    @CurrentContext()
    context: RequestContext,
    @Param("id") id: string,
    @Body() dto: CreateAgentFromTemplateDto,
  ) {
    return this.service.createAgentFromTemplate(
      context,
      id,
      dto,
    );
  }

  @Patch(":id")
  @RequirePermissions(
    PERMISSIONS.AGENT_MANAGE,
  )
  @ApiOperation({
    summary: "Update agent template",
  })
  update(
    @CurrentContext()
    context: RequestContext,
    @Param("id") id: string,
    @Body() dto: UpdateAgentTemplateDto,
  ) {
    return this.service.update(
      context,
      id,
      dto,
    );
  }

  @Delete(":id")
  @RequirePermissions(
    PERMISSIONS.AGENT_MANAGE,
  )
  @ApiOperation({
    summary: "Delete agent template",
  })
  remove(
    @CurrentContext()
    context: RequestContext,
    @Param("id") id: string,
  ) {
    return this.service.remove(
      context,
      id,
    );
  }
}
