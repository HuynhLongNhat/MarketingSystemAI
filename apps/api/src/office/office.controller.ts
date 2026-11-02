
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentContext } from "../auth/current-context.decorator.js";
import type { RequestContext } from "../auth/request-context.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { RequirePermissions } from "../common/permissions/permissions.decorator.js";
import { PERMISSIONS } from "../common/permissions/permissions.js";

import { AssignOfficeDeskDto } from "./office.dto.js";
import { OfficeService } from "./office.service.js";

@ApiTags("Office")
@Controller("office")
@UseGuards(AuthGuard, PermissionsGuard)
export class OfficeController {
  constructor(
    private readonly officeService: OfficeService,
  ) {}

  @Get("assignments")
  @RequirePermissions(PERMISSIONS.AGENT_READ)
  @ApiOperation({
    summary: "List office desk assignments",
  })
  listAssignments(
    @CurrentContext() context: RequestContext,
  ) {
    return this.officeService.listAssignments(context);
  }

  @Put("desks/:deskId")
  @RequirePermissions(PERMISSIONS.AGENT_MANAGE)
  @ApiOperation({
    summary: "Assign or move an AI agent to a desk",
  })
  assignDesk(
    @CurrentContext() context: RequestContext,
    @Param("deskId") deskId: string,
    @Body() dto: AssignOfficeDeskDto,
  ) {
    return this.officeService.assignDesk(
      context,
      deskId,
      dto.agentId,
    );
  }

  @Delete("desks/:deskId")
  @RequirePermissions(PERMISSIONS.AGENT_MANAGE)
  @ApiOperation({
    summary: "Unassign the agent from a desk",
  })
  unassignDesk(
    @CurrentContext() context: RequestContext,
    @Param("deskId") deskId: string,
  ) {
    return this.officeService.unassignDesk(
      context,
      deskId,
    );
  }
}
