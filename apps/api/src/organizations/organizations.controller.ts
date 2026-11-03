
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
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
import { AiUsageQuotaManagementService } from "./ai-usage-quota.service.js";
import { UpdateAiUsageQuotaDto } from "./ai-usage-quota.dto.js";

import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentContext } from "../auth/current-context.decorator.js";
import type { RequestContext } from "../auth/request-context.js";

@ApiTags("Organizations")
@Controller("organizations")
@UseGuards(AuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly aiUsageQuotaService: AiUsageQuotaManagementService,
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

  @Get("current/ai-quota")
  @RequirePermissions(PERMISSIONS.AI_USAGE_QUOTA_READ)
  @ApiOperation({
    summary: "Get current organization's monthly AI token quota",
  })
  getAiUsageQuota(
    @CurrentContext() ctx: RequestContext,
  ) {
    return this.aiUsageQuotaService.getCurrent(ctx);
  }

  @Put("current/ai-quota")
  @RequirePermissions(PERMISSIONS.AI_USAGE_QUOTA_MANAGE)
  @ApiOperation({
    summary: "Set current organization's monthly AI token quota",
  })
  updateAiUsageQuota(
    @CurrentContext() ctx: RequestContext,
    @Body() dto: UpdateAiUsageQuotaDto,
  ) {
    return this.aiUsageQuotaService.updateCurrent(ctx, dto);
  }

  @Delete("current/ai-quota")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.AI_USAGE_QUOTA_MANAGE)
  @ApiOperation({
    summary: "Remove current organization's monthly AI token quota",
  })
  removeAiUsageQuota(
    @CurrentContext() ctx: RequestContext,
  ) {
    return this.aiUsageQuotaService.removeCurrent(ctx);
  }
}
