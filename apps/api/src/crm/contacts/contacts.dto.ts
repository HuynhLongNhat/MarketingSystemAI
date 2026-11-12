import { Type } from "class-transformer";
import { IsArray, IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateContactDto {
  @IsOptional() @IsString() @MaxLength(200) displayName?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(30, { each: true }) tags?: string[];
}
export class UpdateContactDto extends CreateContactDto {}
export class ListContactsQueryDto {
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsString() @MaxLength(30) tag?: string;
  @IsOptional() @IsIn(["updated", "created", "name"]) sort?: "updated" | "created" | "name";
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
export class LinkConversationContactDto { @IsString() @MaxLength(128) contactId!: string; }
