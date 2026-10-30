import {
  IsEmail,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

import { CONVERSATION_STATUSES } from "@workspace/db/node";
export class CreateContactSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

  @IsISO8601()
  expiresAt!: string;
}

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  contactSessionId!: string;
}

export class UpdateConversationStatusDto {
  @IsIn(CONVERSATION_STATUSES)
  status!: "unresolved" | "escalated" | "resolved";
}

export class ListConversationsQueryDto {
  @IsOptional()
  @IsIn(["unresolved", "escalated", "resolved"])
  status?: "unresolved" | "escalated" | "resolved";

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}