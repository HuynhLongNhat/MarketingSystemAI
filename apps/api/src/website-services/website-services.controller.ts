import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentContext } from "../auth/current-context.decorator.js";
import type { RequestContext } from "../auth/request-context.js";
import { RequirePermissions } from "../common/permissions/permissions.decorator.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { PERMISSIONS } from "../common/permissions/permissions.js";
import { CreateWebsiteProjectDto, UpdateWebsiteProjectDto } from "./website-services.dto.js";
import { WebsiteServicesService } from "./website-services.service.js";

@ApiTags("Website Services")
@Controller("website-services")
@UseGuards(AuthGuard, PermissionsGuard)
export class WebsiteServicesController {
  constructor(private readonly websiteServices: WebsiteServicesService) {}

  @Get("templates")
  @RequirePermissions(PERMISSIONS.WEBSITE_SERVICES_READ)
  @ApiOperation({ summary: "List supported landing-page templates" })
  listTemplates() { return this.websiteServices.listTemplates(); }

  @Get("projects")
  @RequirePermissions(PERMISSIONS.WEBSITE_SERVICES_READ)
  @ApiOperation({ summary: "List organization website projects" })
  list(@CurrentContext() context: RequestContext) { return this.websiteServices.list(context); }

  @Get("projects/:id")
  @RequirePermissions(PERMISSIONS.WEBSITE_SERVICES_READ)
  @ApiOperation({ summary: "Get an organization website project" })
  getById(@CurrentContext() context: RequestContext, @Param("id") id: string) { return this.websiteServices.getById(context, id); }

  @Post("projects")
  @RequirePermissions(PERMISSIONS.WEBSITE_SERVICES_MANAGE)
  @ApiOperation({ summary: "Create a template-based landing-page project" })
  create(@CurrentContext() context: RequestContext, @Body() dto: CreateWebsiteProjectDto) { return this.websiteServices.create(context, dto); }

  @Patch("projects/:id")
  @RequirePermissions(PERMISSIONS.WEBSITE_SERVICES_MANAGE)
  @ApiOperation({ summary: "Update a website project" })
  update(@CurrentContext() context: RequestContext, @Param("id") id: string, @Body() dto: UpdateWebsiteProjectDto) { return this.websiteServices.update(context, id, dto); }

  @Delete("projects/:id")
  @RequirePermissions(PERMISSIONS.WEBSITE_SERVICES_MANAGE)
  @ApiOperation({ summary: "Delete a website project" })
  remove(@CurrentContext() context: RequestContext, @Param("id") id: string) { return this.websiteServices.remove(context, id); }
}
