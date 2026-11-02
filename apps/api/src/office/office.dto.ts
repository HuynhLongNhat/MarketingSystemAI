
import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class AssignOfficeDeskDto {
  @ApiProperty({
    description: "ID of the AI agent to assign to this desk",
    format: "uuid",
  })
  @IsUUID()
  agentId!: string;
}
