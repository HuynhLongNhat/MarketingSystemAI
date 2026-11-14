import { Module } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { SearchProviderConnectionTestService } from "./search-provider-connection-test.service.js";
import { SearchProvidersController } from "./search-providers.controller.js";
import { SearchProvidersService } from "./search-providers.service.js";

@Module({ controllers: [SearchProvidersController], providers: [SearchProvidersService, SearchProviderConnectionTestService, AuthGuard, PermissionsGuard], exports: [SearchProvidersService] })
export class SearchProvidersModule {}
