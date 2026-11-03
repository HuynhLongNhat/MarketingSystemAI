import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class DefaultSuggestionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  suggestion1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  suggestion2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  suggestion3?: string;
}

export class UpdateWidgetSettingsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  greetMessage!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => DefaultSuggestionsDto)
  defaultSuggestions!: DefaultSuggestionsDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  allowedOrigins?: string[];
}