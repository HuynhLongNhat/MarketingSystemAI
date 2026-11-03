
import { Module } from "@nestjs/common";

import { PermissionsGuard } from "../common/permissions/permissions.guard.js";

import { OrganizationsController } from "./organizations.controller.js";
import { OrganizationsService } from "./organizations.service.js";
import { AiUsageQuotaManagementService } from "./ai-usage-quota.service.js";

import { AuthGuard } from "../auth/auth.guard.js";

@Module({
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    AiUsageQuotaManagementService,
    AuthGuard,
    PermissionsGuard,
  ],
})
export class OrganizationsModule {}
