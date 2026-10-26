
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { DatabaseModule } from './database/database.module.js';
import { WidgetSettingsModule } from './widget-settings/widget-settings.module.js';

@Module({
  imports: [DatabaseModule, WidgetSettingsModule],
  controllers: [HealthController],
})
export class AppModule {}
