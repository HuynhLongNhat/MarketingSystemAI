import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentContext } from "../auth/current-context.decorator.js";
import type { RequestContext } from "../auth/request-context.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { RequirePermissions } from "../common/permissions/permissions.decorator.js";
import { PERMISSIONS } from "../common/permissions/permissions.js";
import { CreateSearchProviderDto, UpdateSearchProviderDto } from "./search-providers.dto.js";
import { SearchProvidersService } from "./search-providers.service.js";
import { SearchProviderTestRateLimiter } from "./search-provider-test-rate-limiter.service.js";

@ApiTags("Search Providers")
@Controller("search-providers")
@UseGuards(AuthGuard, PermissionsGuard)
export class SearchProvidersController {
  constructor(private readonly service: SearchProvidersService, private readonly testRateLimiter: SearchProviderTestRateLimiter) {}
  @Get() @RequirePermissions(PERMISSIONS.AI_PROVIDER_READ) @ApiOperation({ summary: "List search provider connections" }) list(@CurrentContext() context: RequestContext) { return this.service.listConnections(context); }
  @Get(":id") @RequirePermissions(PERMISSIONS.AI_PROVIDER_READ) get(@CurrentContext() context: RequestContext, @Param("id") id: string) { return this.service.getConnection(context, id); }
  @Post() @RequirePermissions(PERMISSIONS.AI_PROVIDER_MANAGE) create(@CurrentContext() context: RequestContext, @Body() dto: CreateSearchProviderDto) { return this.service.createConnection(context, dto); }
  @Patch(":id") @RequirePermissions(PERMISSIONS.AI_PROVIDER_MANAGE) update(@CurrentContext() context: RequestContext, @Param("id") id: string, @Body() dto: UpdateSearchProviderDto) { return this.service.updateConnection(context, id, dto); }
  @Delete(":id") @HttpCode(HttpStatus.OK) @RequirePermissions(PERMISSIONS.AI_PROVIDER_MANAGE) remove(@CurrentContext() context: RequestContext, @Param("id") id: string) { return this.service.deleteConnection(context, id); }
  @Post(":id/test") @HttpCode(HttpStatus.OK) @RequirePermissions(PERMISSIONS.AI_PROVIDER_MANAGE) @ApiOperation({ summary: "Manually test stored Tavily credentials; this may consume provider credits" }) async test(@CurrentContext() context: RequestContext, @Param("id") id: string) { const lease = await this.testRateLimiter.acquire(context.organizationId, id); try { return await this.service.testConnection(context, id); } finally { await lease.release(); } }
}
