import { Module } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { SearchProviderConnectionTestService } from "./search-provider-connection-test.service.js";
import { SearchProvidersController } from "./search-providers.controller.js";
import { SearchProvidersService } from "./search-providers.service.js";
import { SearchProviderTestRateLimiter } from "./search-provider-test-rate-limiter.service.js";
import { SearchProviderRuntimeService } from "./search-provider-runtime.service.js";
import { TavilySearchAdapter } from "./tavily-search.adapter.js";

@Module({ controllers: [SearchProvidersController], providers: [SearchProvidersService, SearchProviderConnectionTestService, SearchProviderTestRateLimiter, TavilySearchAdapter, SearchProviderRuntimeService, AuthGuard, PermissionsGuard], exports: [SearchProvidersService, SearchProviderRuntimeService] })
export class SearchProvidersModule {}
