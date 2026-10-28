
import {
  Controller,
  Get,
  Param,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";


import { WidgetSettingsService } from "./widget-settings.service.js";
import { AuthGuard } from "src/auth/auth.guard.js";
import { CurrentContext } from "src/auth/current-context.decorator.js";
import { RequestContext } from "src/auth/request-context.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { RequirePermissions } from "../common/permissions/permissions.decorator.js";
import { PERMISSIONS } from "../common/permissions/permissions.js";
@ApiTags("Widget Settings")
@Controller("widget-settings")
@UseGuards(AuthGuard, PermissionsGuard)
export class WidgetSettingsController {
  constructor(
    private readonly widgetSettingsService: WidgetSettingsService,
  ) {}

  @Get(":organizationId")
  @ApiOperation({
    summary: "Get widget settings for current organization",
  })
  @ApiParam({
    name: "organizationId",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Widget settings retrieved successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Authentication required",
  })
  @ApiResponse({
    status: 403,
    description: "Organization access denied",
  })
  @RequirePermissions(PERMISSIONS.WIDGET_READ)
  getByOrganizationId(
    @Param("organizationId") organizationId: string,
    @CurrentContext() ctx: RequestContext,
  ) {
    if (organizationId !== ctx.organizationId) {
      throw new ForbiddenException("Cross-tenant access denied");
    }

    return this.widgetSettingsService.getByOrganizationId(
      ctx.organizationId,
    );
  }
}
