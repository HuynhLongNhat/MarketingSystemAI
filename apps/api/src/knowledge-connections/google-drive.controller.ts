
import {
  Controller,
  Delete,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";

import {
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import type {
  Request,
  Response,
} from "express";

import { AuthGuard } from "../auth/auth.guard.js";

import { CurrentContext } from "../auth/current-context.decorator.js";

import type { RequestContext } from "../auth/request-context.js";

import { PermissionsGuard } from "../common/permissions/permissions.guard.js";

import { RequirePermissions } from "../common/permissions/permissions.decorator.js";

import { PERMISSIONS } from "../common/permissions/permissions.js";

import { GoogleDriveOAuthService } from "./google-drive-oauth.service.js";

const STATE_COOKIE = "gdrive_oauth_nonce";

function readCookie(
  request: Request,
  name: string,
): string | undefined {
  const parts = (
    request.headers.cookie ?? ""
  ).split(";");

  for (const part of parts) {
    const [key, ...values] = part.trim().split("=");

    if (key === name) {
      return values.join("=");
    }
  }

  return undefined;
}

function cookieOptions() {
  return {
    httpOnly: true as const,
    secure:
      process.env.APP_ENV === "production" ||
      process.env.APP_ENV === "staging",
    sameSite: "lax" as const,
    path:
      "/v1/knowledge-connections/google/callback",
    maxAge: 10 * 60 * 1000,
  };
}

@ApiTags("Knowledge Connections")
@Controller("knowledge-connections/google")
@UseGuards(AuthGuard, PermissionsGuard)
export class GoogleDriveController {
  constructor(
    private readonly oauth: GoogleDriveOAuthService,
  ) {}

  @Get("start")
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_UPDATE)
  @ApiOperation({
    summary: "Start Google Drive OAuth",
  })
  start(
    @CurrentContext() context: RequestContext,
    @Res() response: Response,
  ) {
    const request =
      this.oauth.getAuthorizationRequest(context);

    response.cookie(
      STATE_COOKIE,
      request.nonce,
      cookieOptions(),
    );

    return response.redirect(302, request.url);
  }

  @Get("callback")
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_UPDATE)
  @ApiOperation({
    summary: "Google Drive OAuth callback",
  })
  async callback(
    @CurrentContext() context: RequestContext,
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const nonce = readCookie(
      request,
      STATE_COOKIE,
    );

    response.clearCookie(STATE_COOKIE, {
      httpOnly: true,
      secure: cookieOptions().secure,
      sameSite: "lax",
      path: cookieOptions().path,
    });

    if (error) {
      return response.status(400).json({
        connected: false,
        error: "Google authorization was denied",
      });
    }

    this.oauth.verifyState(
      context,
      nonce,
      state,
    );

    const result = await this.oauth.complete(
      context,
      code ?? "",
    );

    return response.status(200).json({
      ...result,
      message: "Google Drive connected successfully",
    });
  }

  @Get("status")
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_READ)
  @ApiOperation({
    summary: "Get Google Drive connection status",
  })
  status(
    @CurrentContext() context: RequestContext,
  ) {
    return this.oauth.status(context);
  }

  @Delete()
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_UPDATE)
  @ApiOperation({
    summary: "Disconnect Google Drive locally",
  })
  disconnect(
    @CurrentContext() context: RequestContext,
  ) {
    return this.oauth.disconnect(context);
  }
}
