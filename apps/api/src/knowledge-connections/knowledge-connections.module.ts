
import { Module } from "@nestjs/common";

import {
  AuthGuard,
} from "../auth/auth.guard.js";

import {
  PermissionsGuard,
} from "../common/permissions/permissions.guard.js";

import {
  JobsModule,
} from "../jobs/jobs.module.js";

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

import {
  GoogleDriveIngestionService,
} from "./google-drive-ingestion.service.js";

@Module({
  imports: [
    JobsModule,
  ],

  controllers: [
    GoogleDriveController,
    GoogleDrivePickerController,
  ],

  providers: [
    GoogleDriveOAuthService,
    GoogleDrivePickerService,
    GoogleDriveIngestionService,
    AuthGuard,
    PermissionsGuard,
  ],

  exports: [
    GoogleDriveOAuthService,
    GoogleDrivePickerService,
    GoogleDriveIngestionService,
  ],
})
export class KnowledgeConnectionsModule {}
