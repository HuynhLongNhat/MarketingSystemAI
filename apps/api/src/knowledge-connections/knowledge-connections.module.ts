
import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";

import {
  PermissionsGuard,
} from "../common/permissions/permissions.guard.js";

import {
  GoogleDriveController,
} from "./google-drive.controller.js";

import {
  GoogleDriveOAuthService,
} from "./google-drive-oauth.service.js";

import {
  GoogleDrivePickerController,
} from "./google-drive-picker.controller.js";

import {
  GoogleDrivePickerService,
} from "./google-drive-picker.service.js";

@Module({
  controllers: [
    GoogleDriveController,
    GoogleDrivePickerController,
  ],
  providers: [
    GoogleDriveOAuthService,
    GoogleDrivePickerService,
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [
    GoogleDriveOAuthService,
    GoogleDrivePickerService,
  ],
})
export class KnowledgeConnectionsModule {}
