import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";

import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    AuthGuard,
  ],
})
export class NotificationsModule {}