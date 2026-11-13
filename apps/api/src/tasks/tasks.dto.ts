import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { AI_TASK_STATUSES } from "@workspace/db/node";
export class CreateTaskDto { @IsString() @MaxLength(200) title!: string; @IsString() @MaxLength(12000) description!: string; @IsOptional() @IsUUID() agentId?: string; }
export class ListTasksDto { @IsOptional() @IsIn(AI_TASK_STATUSES) status?: typeof AI_TASK_STATUSES[number]; @IsOptional() @IsUUID() agentId?: string; }
