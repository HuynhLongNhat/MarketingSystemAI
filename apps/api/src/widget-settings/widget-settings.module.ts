
import { Module } from "@nestjs/common";

import { WidgetSettingsController } from "./widget-settings.controller.js";
import { WidgetSettingsService } from "./widget-settings.service.js";

import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { AuthGuard } from "src/auth/auth.guard.js";

@Module({
  controllers: [WidgetSettingsController],
  providers: [
    WidgetSettingsService,
    AuthGuard,
    PermissionsGuard,
  ],
})
export class WidgetSettingsModule {}
