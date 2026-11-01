
import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";

import { DepartmentsController } from "./departments.controller.js";
import { DepartmentsService } from "./departments.service.js";

@Module({
  controllers: [DepartmentsController],
  providers: [
    DepartmentsService,
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
