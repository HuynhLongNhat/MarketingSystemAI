import { IsNotEmpty, IsString } from "class-validator";

export class AssignConversationDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}