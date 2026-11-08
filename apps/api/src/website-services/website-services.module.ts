import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { WebsiteProjectsRepository } from "./website-projects.repository.js";
import { WebsiteServicesController } from "./website-services.controller.js";
import { WebsiteServicesService } from "./website-services.service.js";

@Module({
  controllers: [WebsiteServicesController],
  providers: [WebsiteServicesService, WebsiteProjectsRepository, AuthGuard, PermissionsGuard],
})
export class WebsiteServicesModule {}
