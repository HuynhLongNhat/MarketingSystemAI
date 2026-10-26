
import { Controller, Get, Param } from '@nestjs/common';
import { WidgetSettingsService } from './widget-settings.service.js';

@Controller('widget-settings')
export class WidgetSettingsController {
  constructor(
    private readonly widgetSettingsService: WidgetSettingsService,
  ) {}

  @Get(':organizationId')
  getByOrganizationId(
    @Param('organizationId') organizationId: string,
  ) {
    return this.widgetSettingsService.getByOrganizationId(
      organizationId,
    );
  }
}
