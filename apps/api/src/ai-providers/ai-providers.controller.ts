
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentContext } from "../auth/current-context.decorator.js";
import type { RequestContext } from "../auth/request-context.js";

import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { RequirePermissions } from "../common/permissions/permissions.decorator.js";
import { PERMISSIONS } from "../common/permissions/permissions.js";

import {
  AI_MODEL_PURPOSES,
  CreateAiProviderDto,
  UpdateAiProviderDto,
  UpsertAiModelDefaultDto,
} from "./ai-providers.dto.js";

import { AiProvidersService } from "./ai-providers.service.js";
import { ModelCatalogService } from "./model-catalog.service.js";

@ApiTags("AI Providers")
@Controller("ai-providers")
@UseGuards(AuthGuard, PermissionsGuard)
export class AiProvidersController {
  constructor(
    private readonly service: AiProvidersService,
    private readonly modelCatalog: ModelCatalogService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AI_PROVIDER_READ)
  @ApiOperation({
    summary: "List AI provider connections",
  })
  listConnections(
    @CurrentContext() ctx: RequestContext,
  ) {
    return this.service.listConnections(ctx);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.AI_PROVIDER_MANAGE)
  @ApiOperation({
    summary: "Create AI provider connection",
  })
  createConnection(
    @CurrentContext() ctx: RequestContext,
    @Body() dto: CreateAiProviderDto,
  ) {
    return this.service.createConnection(ctx, dto);
  }

  @Get("catalog/providers")
  @RequirePermissions(PERMISSIONS.AI_PROVIDER_READ)
  @ApiOperation({
    summary: "List supported AI provider definitions",
  })
  listCatalogProviders() {
    return this.modelCatalog.listProviders();
  }

  @Get("catalog/models")
  @RequirePermissions(PERMISSIONS.AI_PROVIDER_READ)
  @ApiOperation({
    summary: "List AI models from external catalog",
  })
  @ApiQuery({
    name: "provider",
    required: true,
    type: String,
  })
  listCatalogModels(
    @Query("provider") provider: string,
  ) {
    return this.modelCatalog.listModels(provider);
  }

  @Get("model-defaults")
  @RequirePermissions(PERMISSIONS.AI_PROVIDER_READ)
  @ApiOperation({
    summary: "List default AI models",
  })
  listModelDefaults(
    @CurrentContext() ctx: RequestContext,
  ) {
    return this.service.listModelDefaults(ctx);
  }

  @Put("model-defaults/:purpose")
  @RequirePermissions(PERMISSIONS.AI_PROVIDER_MANAGE)
  @ApiOperation({
    summary: "Set default AI model",
  })
  @ApiParam({
    name: "purpose",
    enum: AI_MODEL_PURPOSES,
  })
  upsertModelDefault(
    @CurrentContext() ctx: RequestContext,
    @Param("purpose") purpose: string,
    @Body() dto: UpsertAiModelDefaultDto,
  ) {
    return this.service.upsertModelDefault(
      ctx,
      purpose,
      dto,
    );
  }

  @Delete("model-defaults/:purpose")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.AI_PROVIDER_MANAGE)
  @ApiOperation({
    summary: "Delete default AI model",
  })
  @ApiParam({
    name: "purpose",
    enum: AI_MODEL_PURPOSES,
  })
  deleteModelDefault(
    @CurrentContext() ctx: RequestContext,
    @Param("purpose") purpose: string,
  ) {
    return this.service.deleteModelDefault(
      ctx,
      purpose,
    );
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.AI_PROVIDER_READ)
  @ApiOperation({
    summary: "Get AI provider metadata",
  })
  getConnection(
    @CurrentContext() ctx: RequestContext,
    @Param("id") id: string,
  ) {
    return this.service.getConnection(ctx, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.AI_PROVIDER_MANAGE)
  @ApiOperation({
    summary: "Update AI provider connection",
  })
  updateConnection(
    @CurrentContext() ctx: RequestContext,
    @Param("id") id: string,
    @Body() dto: UpdateAiProviderDto,
  ) {
    return this.service.updateConnection(
      ctx,
      id,
      dto,
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.AI_PROVIDER_MANAGE)
  @ApiOperation({
    summary: "Delete AI provider connection",
  })
  deleteConnection(
    @CurrentContext() ctx: RequestContext,
    @Param("id") id: string,
  ) {
    return this.service.deleteConnection(
      ctx,
      id,
    );
  }
}
