
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentContext } from "../auth/current-context.decorator.js";
import type { RequestContext } from "../auth/request-context.js";

import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { RequirePermissions } from "../common/permissions/permissions.decorator.js";
import { PERMISSIONS } from "../common/permissions/permissions.js";

import { UpdateWidgetSettingsDto } from "./widget-settings.dto.js";
import { WidgetSettingsService } from "./widget-settings.service.js";

@ApiTags("Widget Settings")
@Controller("widget-settings")
@UseGuards(AuthGuard, PermissionsGuard)
export class WidgetSettingsController {
  constructor(
    private readonly widgetSettingsService: WidgetSettingsService,
  ) {}

  @Get("current")
  @RequirePermissions(PERMISSIONS.WIDGET_READ)
  @ApiOperation({
    summary: "Get widget settings for active organization",
  })
  @ApiResponse({
    status: 200,
    description: "Widget settings retrieved",
  })
  @ApiResponse({
    status: 401,
    description: "Authentication required",
  })
  @ApiResponse({
    status: 403,
    description: "Organization access denied",
  })
  getCurrentSettings(
    @CurrentContext() ctx: RequestContext,
  ) {
    return this.widgetSettingsService.getCurrent(ctx);
  }

  @Put("current")
  @RequirePermissions(PERMISSIONS.WIDGET_UPDATE)
  @ApiOperation({
    summary: "Save chat settings for active organization",
  })
  @ApiResponse({
    status: 200,
    description: "Widget settings saved",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid widget settings",
  })
  @ApiResponse({
    status: 403,
    description: "Insufficient permission",
  })
  updateCurrentSettings(
    @CurrentContext() ctx: RequestContext,
    @Body() dto: UpdateWidgetSettingsDto,
  ) {
    return this.widgetSettingsService.updateCurrent(
      ctx,
      dto,
    );
  }

  // Legacy endpoint: giữ để không làm hỏng client cũ.
  @Get(":organizationId")
  @RequirePermissions(PERMISSIONS.WIDGET_READ)
  @ApiOperation({
    summary: "Get widget settings by organization ID (legacy)",
    deprecated: true,
  })
  @ApiParam({
    name: "organizationId",
    type: String,
  })
  getByOrganizationId(
    @Param("organizationId") organizationId: string,
    @CurrentContext() ctx: RequestContext,
  ) {
    if (organizationId !== ctx.organizationId) {
      throw new ForbiddenException(
        "Cross-tenant access denied",
      );
    }

    return this.widgetSettingsService.getByOrganizationId(
      ctx,
      organizationId,
    );
  }
}
