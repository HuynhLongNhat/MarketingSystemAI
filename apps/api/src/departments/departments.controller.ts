
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
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentContext } from "../auth/current-context.decorator.js";
import type { RequestContext } from "../auth/request-context.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { RequirePermissions } from "../common/permissions/permissions.decorator.js";
import { PERMISSIONS } from "../common/permissions/permissions.js";

import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from "./departments.dto.js";
import { DepartmentsService } from "./departments.service.js";

@ApiTags("Departments")
@Controller("departments")
@UseGuards(AuthGuard, PermissionsGuard)
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.DEPARTMENT_READ)
  @ApiOperation({ summary: "List organization departments" })
  list(@CurrentContext() context: RequestContext) {
    return this.departmentsService.list(context);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.DEPARTMENT_READ)
  @ApiOperation({ summary: "Get department by ID" })
  getById(
    @CurrentContext() context: RequestContext,
    @Param("id") id: string,
  ) {
    return this.departmentsService.getById(context, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.DEPARTMENT_MANAGE)
  @ApiOperation({ summary: "Create department" })
  create(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(context, dto);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.DEPARTMENT_MANAGE)
  @ApiOperation({ summary: "Update department" })
  update(
    @CurrentContext() context: RequestContext,
    @Param("id") id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(context, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.DEPARTMENT_MANAGE)
  @ApiOperation({ summary: "Delete department" })
  remove(
    @CurrentContext() context: RequestContext,
    @Param("id") id: string,
  ) {
    return this.departmentsService.remove(context, id);
  }
}
