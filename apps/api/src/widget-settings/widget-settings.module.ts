
import { Module } from '@nestjs/common';
import { WidgetSettingsController } from './widget-settings.controller.js';
import { WidgetSettingsService } from './widget-settings.service.js';

@Module({
  controllers: [WidgetSettingsController],
  providers: [WidgetSettingsService],
})
export class WidgetSettingsModule {}
