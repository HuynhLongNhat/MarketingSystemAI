
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

import { AI_PROVIDER_TYPES } from "@workspace/db/node";
import type { AiProviderType } from "@workspace/db/node";

export const AI_MODEL_PURPOSES = [
  "customer_support",
  "message_enhancement",
  "general",
] as const;

export type AiModelPurpose =
  (typeof AI_MODEL_PURPOSES)[number];

export class CreateAiProviderDto {
  @ApiProperty({ enum: AI_PROVIDER_TYPES })
  @IsIn(AI_PROVIDER_TYPES)
  provider!: AiProviderType;

  @ApiProperty({
    example: "Main OpenRouter",
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: "API key. Stored encrypted and never returned.",
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  apiKey!: string;
}

export class UpdateAiProviderDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: "Replace existing encrypted API key.",
    writeOnly: true,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  apiKey?: string;
}

export class UpsertAiModelDefaultDto {
  @ApiProperty({
    description: "Connection ID belonging to active organization",
    format: "uuid",
  })
  @IsUUID()
  connectionId!: string;

  @ApiProperty({
    example: "openai/gpt-4o-mini",
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  modelId!: string;
}

