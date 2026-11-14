import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { CEO_PLAN_APPROVAL_STATUSES } from "@workspace/db/node";

export class CreateCeoPlanDto {
  @IsUUID() ceoAgentId!: string;
  @IsString() @MaxLength(200) title!: string;
  @IsString() @MaxLength(12000) objective!: string;
}
export class DecideCeoPlanDto {
  @IsIn(["approved", "rejected"] as const) decision!: typeof CEO_PLAN_APPROVAL_STATUSES[number];
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}
