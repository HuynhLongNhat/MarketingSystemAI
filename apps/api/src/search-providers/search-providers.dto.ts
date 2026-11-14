import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

import { SEARCH_PROVIDER_TYPES, type SearchProviderType } from "@workspace/db/node";

export class CreateSearchProviderDto {
  @ApiProperty({ enum: SEARCH_PROVIDER_TYPES })
  @IsIn(SEARCH_PROVIDER_TYPES)
  provider!: SearchProviderType;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ writeOnly: true, description: "Stored encrypted and never returned." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  apiKey!: string;
}

export class UpdateSearchProviderDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ writeOnly: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
