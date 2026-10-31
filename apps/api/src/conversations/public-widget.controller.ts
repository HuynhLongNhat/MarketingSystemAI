import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";
import { PublicWidgetService } from "./public-widget.service.js";

class CreatePublicSessionDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;
}

class SendPublicMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;
}

@ApiTags("Public Widget")
@Controller("public/widget")
export class PublicWidgetController {
  constructor(private readonly service: PublicWidgetService) {}

  private token(authorization?: string) {
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Widget token required");
    }

    return authorization.slice(7);
  }

  @Post("sessions")
  @ApiOperation({ summary: "Create visitor session" })
  createSession(@Body() dto: CreatePublicSessionDto) {
    return this.service.createSession(dto);
  }

  @Get("sessions/current")
  validateSession(@Headers("authorization") authorization?: string) {
    return this.service.validateSession(this.token(authorization));
  }

  @Post("conversations")
  createConversation(@Headers("authorization") authorization?: string) {
    return this.service.createConversation(this.token(authorization));
  }

  @Get("conversations")
  listConversations(@Headers("authorization") authorization?: string) {
    return this.service.listConversations(this.token(authorization));
  }

  @Get("conversations/:id")
  getConversation(
    @Headers("authorization") authorization: string,
    @Param("id") id: string,
  ) {
    return this.service.getConversation(this.token(authorization), id);
  }

  @Get("conversations/:id/messages")
  listMessages(
    @Headers("authorization") authorization: string,
    @Param("id") id: string,
    @Query("before") before?: string,
  ) {
    return this.service.listMessages(this.token(authorization), id, before);
  }

  @Post("conversations/:id/messages")
  sendMessage(
    @Headers("authorization") authorization: string,
    @Param("id") id: string,
    @Body() dto: SendPublicMessageDto,
  ) {
    return this.service.sendMessage(this.token(authorization), id, dto.content);
  }

  @Get("organizations/:organizationId")
  @ApiOperation({
    summary: "Get public widget configuration",
  })
  getPublicConfiguration(@Param("organizationId") organizationId: string) {
    return this.service.getPublicConfiguration(organizationId);
  }
}
