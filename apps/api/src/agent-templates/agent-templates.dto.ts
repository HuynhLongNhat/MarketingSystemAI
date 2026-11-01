
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

import { AGENT_CATEGORIES } from "@workspace/db/node";
import type { AgentCategory } from "@workspace/db/node";

export class CreateAgentTemplateDto {
  @ApiProperty({ example: "Customer Support Agent" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: "customer-support" })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  slug!: string;

  @ApiPropertyOptional({ enum: AGENT_CATEGORIES })
  @IsOptional()
  @IsIn(AGENT_CATEGORIES)
  category?: AgentCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    example: "You are a professional customer support assistant.",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  systemPrompt!: string;

  @ApiPropertyOptional({ example: "1.0.0" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateAgentTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ enum: AGENT_CATEGORIES })
  @IsOptional()
  @IsIn(AGENT_CATEGORIES)
  category?: AgentCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  systemPrompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
