
import {
  Controller,
  Delete,
  Get,
  Header,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";

import {
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import type { Request, Response } from "express";

import { AuthGuard } from "../auth/auth.guard.js";

import {
  CurrentContext,
} from "../auth/current-context.decorator.js";

import type {
  RequestContext,
} from "../auth/request-context.js";

import {
  PermissionsGuard,
} from "../common/permissions/permissions.guard.js";

import {
  RequirePermissions,
} from "../common/permissions/permissions.decorator.js";

import {
  PERMISSIONS,
} from "../common/permissions/permissions.js";

import {
  GoogleDriveOAuthService,
} from "./google-drive-oauth.service.js";

const STATE_COOKIE = "gdrive_oauth_nonce";

function readCookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.cookie ?? "").split(";")) {
    const [key, ...values] = part.trim().split("=");

    if (key === name) {
      return values.join("=");
    }
  }

  return undefined;
}

function stateCookieOptions() {
  return {
    httpOnly: true as const,
    secure:
      process.env.APP_ENV === "production" ||
      process.env.APP_ENV === "staging",
    sameSite: "lax" as const,
    // A cookie Path must path-match the response that sets it (`/start`) as
    // well as the callback that consumes it. Using `/callback` here causes
    // browsers to reject the Set-Cookie header issued by `/start`.
    path: "/v1/knowledge-connections/google",
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
    const { url, nonce } = this.oauth.getAuthorizationRequest(context);

    response.setHeader("Cache-Control", "no-store");
    response.cookie(STATE_COOKIE, nonce, stateCookieOptions());

    return response.redirect(302, url);
  }

  @Get("callback")
  @Header("Cache-Control", "no-store")
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
    const nonce = readCookie(request, STATE_COOKIE);

    response.setHeader("Cache-Control", "no-store");

    // Clear before processing: a state is single-use even when Google returns
    // an authorization error or token exchange later fails.
    response.clearCookie(STATE_COOKIE, {
      httpOnly: true,
      secure: stateCookieOptions().secure,
      sameSite: "lax",
      path: stateCookieOptions().path,
    });

    // Validate state even when Google returns an error.
    this.oauth.verifyState(context, nonce, state);

    if (error) {
      return response.status(400).json({
        connected: false,
        error: "Google authorization was denied",
      });
    }

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
  @Header("Cache-Control", "no-store")
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
