
import {
  Body,
  Controller,
  Delete,
  Get,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { IsUUID } from "class-validator";

import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentContext } from "../auth/current-context.decorator.js";
import type { RequestContext } from "../auth/request-context.js";

import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { RequirePermissions } from "../common/permissions/permissions.decorator.js";
import { PERMISSIONS } from "../common/permissions/permissions.js";

import { SupportAssignmentService } from "./support-assignment.service.js";

class AssignSupportAgentDto {
  @IsUUID()
  agentId!: string;
}

@ApiTags("Customer Support Assignment")
@Controller("customer-support/assignment")
@UseGuards(AuthGuard, PermissionsGuard)
export class SupportAssignmentController {
  constructor(
    private readonly service: SupportAssignmentService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AGENT_READ)
  @ApiOperation({
    summary: "Get assigned customer support Agent",
  })
  getCurrent(
    @CurrentContext() context: RequestContext,
  ) {
    return this.service.getCurrent(context);
  }

  @Put()
  @RequirePermissions(PERMISSIONS.AGENT_MANAGE)
  @ApiOperation({
    summary: "Assign customer support Agent",
  })
  assign(
    @CurrentContext() context: RequestContext,
    @Body() dto: AssignSupportAgentDto,
  ) {
    return this.service.assign(context, dto.agentId);
  }

  @Delete()
  @RequirePermissions(PERMISSIONS.AGENT_MANAGE)
  @ApiOperation({
    summary: "Remove customer support Agent assignment",
  })
  remove(
    @CurrentContext() context: RequestContext,
  ) {
    return this.service.remove(context);
  }
}
