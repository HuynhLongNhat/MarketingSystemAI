
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";

import { ApiTags } from "@nestjs/swagger";

import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
} from "class-validator";

import { AuthGuard } from "../auth/auth.guard.js";

import {
  CurrentContext,
} from "../auth/current-context.decorator.js";

import type {
  RequestContext,
} from "../auth/request-context.js";

import {
  PermissionsGuard,
} from "../common/permissions/permissions.guard.js";

import {
  RequirePermissions,
} from "../common/permissions/permissions.decorator.js";

import {
  PERMISSIONS,
} from "../common/permissions/permissions.js";

import {
  GoogleDrivePickerService,
} from "./google-drive-picker.service.js";

class SaveGoogleFilesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  fileIds!: string[];
}

@ApiTags("Knowledge Connections")
@Controller("knowledge-connections/google")
@UseGuards(AuthGuard, PermissionsGuard)
export class GoogleDrivePickerController {
  constructor(
    private readonly picker: GoogleDrivePickerService,
  ) {}

  @Get("picker-token")
  @Header("Cache-Control", "no-store")
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_UPDATE)
  pickerToken(@CurrentContext() ctx: RequestContext) {
    return this.picker.pickerToken(ctx);
  }

  @Get("sources")
  @Header("Cache-Control", "no-store")
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_READ)
  sources(@CurrentContext() ctx: RequestContext) {
    return this.picker.listSources(ctx);
  }

  @Get("sources/limits")
  @Header("Cache-Control", "no-store")
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_READ)
  sourceLimits() {
    return this.picker.sourceLimits();
  }

  @Post("sources")
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_UPDATE)
  saveSources(
    @CurrentContext() ctx: RequestContext,
    @Body() dto: SaveGoogleFilesDto,
  ) {
    return this.picker.saveSelectedFiles(
      ctx,
      dto.fileIds,
    );
  }

  @Post("sources/:sourceId/retry")
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_UPDATE)
  retrySource(
    @CurrentContext() ctx: RequestContext,
    @Param("sourceId") sourceId: string,
  ) {
    return this.picker.retrySource(ctx, sourceId);
  }

  @Delete("sources/:sourceId")
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_UPDATE)
  removeSource(
    @CurrentContext() ctx: RequestContext,
    @Param("sourceId") sourceId: string,
  ) {
    return this.picker.removeSource(ctx, sourceId);
  }
}
