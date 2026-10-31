
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateKnowledgeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  answer!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

export class UpdateKnowledgeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  answer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
