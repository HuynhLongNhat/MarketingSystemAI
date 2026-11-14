import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "../common/permissions/permissions.guard.js";
import { CeoPlanningController } from "./ceo-planning.controller.js";
import { CeoPlanningService } from "./ceo-planning.service.js";
@Module({ imports: [TasksModule], controllers: [CeoPlanningController], providers: [CeoPlanningService, AuthGuard, PermissionsGuard] })
export class CeoPlanningModule {}
