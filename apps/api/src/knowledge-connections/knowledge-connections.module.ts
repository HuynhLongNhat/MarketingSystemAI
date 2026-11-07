
import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";

import { PermissionsGuard } from "../common/permissions/permissions.guard.js";

import { GoogleDriveController } from "./google-drive.controller.js";

import { GoogleDriveOAuthService } from "./google-drive-oauth.service.js";

@Module({
  controllers: [GoogleDriveController],
  providers: [
    GoogleDriveOAuthService,
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [GoogleDriveOAuthService],
})
export class KnowledgeConnectionsModule {}
