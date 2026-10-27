import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";

import { WidgetSettingsService } from "./widget-settings.service.js";

@ApiTags("Widget Settings")
@Controller("widget-settings")
export class WidgetSettingsController {
  constructor(private readonly widgetSettingsService: WidgetSettingsService) {}

  @Get(":organizationId")
  @ApiOperation({
    summary: "Get widget settings by organization ID",
  })
  @ApiParam({
    name: "organizationId",
    type: String,
    description: "Organization identifier",
  })
  @ApiResponse({
    status: 200,
    description: "Widget settings retrieved successfully",
  })
  @ApiResponse({
    status: 200,
    description: "Returns widget settings, or null when no settings exist.",
  })
  getByOrganizationId(@Param("organizationId") organizationId: string) {
    return this.widgetSettingsService.getByOrganizationId(organizationId);
  }
}
