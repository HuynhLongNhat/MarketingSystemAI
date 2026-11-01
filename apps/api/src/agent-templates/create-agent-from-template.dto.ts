
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreateAgentFromTemplateDto {
  @ApiPropertyOptional({
    example: "Customer Support - Website",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  connectionId?: string;

  @ApiPropertyOptional({
    example: "openai/gpt-4o-mini",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  modelId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  enabledTools?: string[];
}
