import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js"; import { CurrentContext } from "../auth/current-context.decorator.js"; import type { RequestContext } from "../auth/request-context.js";
import { RequirePermissions } from "../common/permissions/permissions.decorator.js"; import { PermissionsGuard } from "../common/permissions/permissions.guard.js"; import { PERMISSIONS } from "../common/permissions/permissions.js";
import { UpdateBusinessProfileDto } from "./business-profile.dto.js"; import { BusinessProfileService } from "./business-profile.service.js";
@Controller("business-profile") @UseGuards(AuthGuard, PermissionsGuard)
export class BusinessProfileController { constructor(private readonly profiles: BusinessProfileService) {} @Get() @RequirePermissions(PERMISSIONS.ORGANIZATION_READ) get(@CurrentContext() ctx: RequestContext) { return this.profiles.getCurrent(ctx); } @Put() @RequirePermissions(PERMISSIONS.ORGANIZATION_UPDATE) update(@CurrentContext() ctx: RequestContext, @Body() dto: UpdateBusinessProfileDto) { return this.profiles.updateCurrent(ctx, dto); } }
