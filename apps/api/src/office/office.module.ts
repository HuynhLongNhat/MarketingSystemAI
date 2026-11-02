
import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";

import { OfficeController } from "./office.controller.js";
import { OfficeService } from "./office.service.js";

@Module({
  controllers: [OfficeController],
  providers: [
    OfficeService,
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [OfficeService],
})
export class OfficeModule {}
