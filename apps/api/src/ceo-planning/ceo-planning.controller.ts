import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentContext } from "../auth/current-context.decorator.js";
import type { RequestContext } from "../auth/request-context.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { RequirePermissions } from "../common/permissions/permissions.decorator.js";
import { PERMISSIONS } from "../common/permissions/permissions.js";
import { CeoPlanningService } from "./ceo-planning.service.js";
import { CreateCeoPlanDto, DecideCeoPlanDto } from "./ceo-planning.dto.js";
@Controller("ceo-plans") @UseGuards(AuthGuard, PermissionsGuard)
export class CeoPlanningController {
  constructor(private readonly plans: CeoPlanningService) {}
  @Get() @RequirePermissions(PERMISSIONS.AGENT_READ) list(@CurrentContext() ctx: RequestContext) { return this.plans.list(ctx); }
  @Get(":id") @RequirePermissions(PERMISSIONS.AGENT_READ) get(@CurrentContext() ctx: RequestContext, @Param("id") id: string) { return this.plans.get(ctx, id); }
  @Post() @RequirePermissions(PERMISSIONS.AGENT_MANAGE) create(@CurrentContext() ctx: RequestContext, @Body() dto: CreateCeoPlanDto) { return this.plans.create(ctx, dto); }
  @Post(":id/decision") @RequirePermissions(PERMISSIONS.AGENT_MANAGE) decide(@CurrentContext() ctx: RequestContext, @Param("id") id: string, @Body() dto: DecideCeoPlanDto) { return this.plans.decide(ctx, id, dto); }
}
