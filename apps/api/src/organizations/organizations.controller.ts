
import {
  Controller,
  Get,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { RequirePermissions } from "../common/permissions/permissions.decorator.js";
import { PERMISSIONS } from "../common/permissions/permissions.js";

import { OrganizationsService } from "./organizations.service.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentContext } from "../auth/current-context.decorator.js";
import type { RequestContext } from "../auth/request-context.js";

@ApiTags("Organizations")
@Controller("organizations")
@UseGuards(AuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get("current")
  @RequirePermissions(PERMISSIONS.ORGANIZATION_READ)
  @ApiOperation({
    summary: "Get current organization",
  })
  getCurrentOrganization(
    @CurrentContext() ctx: RequestContext,
  ) {
    return this.organizationsService.getOrganization(ctx);
  }

  @Get("current/members")
  @RequirePermissions(PERMISSIONS.MEMBER_READ)
  @ApiOperation({
    summary: "List members of current organization",
  })
  listMembers(
    @CurrentContext() ctx: RequestContext,
  ) {
    return this.organizationsService.listMembers(ctx);
  }
}
