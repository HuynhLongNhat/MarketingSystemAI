
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import {
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard.js";

import { CurrentContext } from "../auth/current-context.decorator.js";

import type { RequestContext } from "../auth/request-context.js";

import { PermissionsGuard } from "../common/permissions/permissions.guard.js";

import { RequirePermissions } from "../common/permissions/permissions.decorator.js";

import { PERMISSIONS } from "../common/permissions/permissions.js";

import {
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
} from "./knowledge.dto.js";

import { KnowledgeService } from "./knowledge.service.js";

@ApiTags("Knowledge Base")
@Controller("knowledge")
@UseGuards(AuthGuard, PermissionsGuard)
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_READ)
  @ApiOperation({
    summary: "List knowledge entries",
  })
  list(@CurrentContext() ctx: RequestContext) {
    return this.knowledgeService.list(ctx);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_READ)
  @ApiOperation({
    summary: "Get knowledge entry",
  })
  getById(
    @CurrentContext() ctx: RequestContext,
    @Param("id") id: string,
  ) {
    return this.knowledgeService.getById(ctx, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_UPDATE)
  @ApiOperation({
    summary: "Create knowledge entry",
  })
  create(
    @CurrentContext() ctx: RequestContext,
    @Body() dto: CreateKnowledgeDto,
  ) {
    return this.knowledgeService.create(ctx, dto);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_UPDATE)
  @ApiOperation({
    summary: "Update knowledge entry",
  })
  update(
    @CurrentContext() ctx: RequestContext,
    @Param("id") id: string,
    @Body() dto: UpdateKnowledgeDto,
  ) {
    return this.knowledgeService.update(ctx, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_UPDATE)
  @ApiOperation({
    summary: "Delete knowledge entry",
  })
  remove(
    @CurrentContext() ctx: RequestContext,
    @Param("id") id: string,
  ) {
    return this.knowledgeService.remove(ctx, id);
  }
}
