
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

import { PublicWidgetService } from "./public-widget.service.js";
import {
  PublicWidgetRateLimitGuard,
  WIDGET_RATE_LIMIT_KEY,
} from "./public-widget-rate-limit.guard.js";

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

class CreateGuestSessionDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;
}

class UpdatePublicSessionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9][0-9 .()-]{7,19}$/, {
    message: "Invalid phone number",
  })
  phone?: string;
}

class SendPublicMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;
}

@ApiTags("Public Widget")
@Controller("public/widget")
@UseGuards(PublicWidgetRateLimitGuard)
export class PublicWidgetController {
  constructor(
    private readonly service: PublicWidgetService,
  ) {}

  private token(authorization?: string) {
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException(
        "Widget token required",
      );
    }

    return authorization.slice(7);
  }

  @Post("sessions")
  @SetMetadata(WIDGET_RATE_LIMIT_KEY, "create-session")
  @ApiOperation({
    summary: "Create identified visitor session",
  })
  createSession(@Body() dto: CreatePublicSessionDto) {
    return this.service.createSession(dto);
  }

  @Post("guest-sessions")
  @SetMetadata(WIDGET_RATE_LIMIT_KEY, "create-session")
  @ApiOperation({
    summary: "Create anonymous guest session",
  })
  createGuestSession(@Body() dto: CreateGuestSessionDto) {
    return this.service.createGuestSession(dto);
  }

  @Get("sessions/current")
  @ApiOperation({
    summary: "Validate current widget session",
  })
  validateSession(
    @Headers("authorization") authorization?: string,
  ) {
    return this.service.validateSession(
      this.token(authorization),
    );
  }

  @Patch("sessions/current")
  @ApiOperation({
    summary: "Add or update visitor contact details",
  })
  updateSession(
    @Headers("authorization") authorization: string,
    @Body() dto: UpdatePublicSessionDto,
  ) {
    return this.service.updateSession(
      this.token(authorization),
      dto,
    );
  }

  @Post("conversations")
  @SetMetadata(WIDGET_RATE_LIMIT_KEY, "create-conversation")
  createConversation(
    @Headers("authorization") authorization?: string,
  ) {
    return this.service.createConversation(
      this.token(authorization),
    );
  }

  @Get("conversations")
  listConversations(
    @Headers("authorization") authorization?: string,
  ) {
    return this.service.listConversations(
      this.token(authorization),
    );
  }

  @Get("conversations/:id")
  getConversation(
    @Headers("authorization") authorization: string,
    @Param("id") id: string,
  ) {
    return this.service.getConversation(
      this.token(authorization),
      id,
    );
  }

  @Get("conversations/:id/messages")
  listMessages(
    @Headers("authorization") authorization: string,
    @Param("id") id: string,
    @Query("before") before?: string,
  ) {
    return this.service.listMessages(
      this.token(authorization),
      id,
      before,
    );
  }

  @Post("conversations/:id/messages")
  @SetMetadata(WIDGET_RATE_LIMIT_KEY, "send-message")
  sendMessage(
    @Headers("authorization") authorization: string,
    @Param("id") id: string,
    @Body() dto: SendPublicMessageDto,
  ) {
    return this.service.sendMessage(
      this.token(authorization),
      id,
      dto.content,
    );
  }

  @Get("organizations/:organizationId")
  @ApiOperation({
    summary: "Get public widget configuration",
  })
  getPublicConfiguration(
    @Param("organizationId") organizationId: string,
  ) {
    return this.service.getPublicConfiguration(
      organizationId,
    );
  }
}
