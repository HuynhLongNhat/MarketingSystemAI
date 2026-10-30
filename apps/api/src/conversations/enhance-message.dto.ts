
import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";

export class EnhanceMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  prompt!: string;
}
