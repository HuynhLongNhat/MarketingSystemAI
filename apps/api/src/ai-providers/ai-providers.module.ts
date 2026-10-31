
import { Module } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";

import { AiProvidersController } from "./ai-providers.controller.js";
import { AiProvidersService } from "./ai-providers.service.js";

@Module({
  controllers: [AiProvidersController],
  providers: [
    AiProvidersService,
    AuthGuard,
    PermissionsGuard,
  ],
})
export class AiProvidersModule {}
