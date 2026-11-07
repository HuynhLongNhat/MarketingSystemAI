import {
  BadGatewayException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { db, knowledgeConnections } from "@workspace/db/node";

import type { RequestContext } from "../auth/request-context.js";

import { encryptGoogleToken } from "./google-token-crypto.js";

const GOOGLE_SCOPE = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GoogleUser = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
};

@Injectable()
export class GoogleDriveOAuthService {
  private config() {
    // Google Drive authorization must use the same OAuth client as the
    // Google social-login provider. A refresh token is bound to its client;
    // selecting a second, differently configured client here causes Google to
    // reject the refresh grant with `invalid_client`.
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI?.trim();

    const signingKey = process.env.BETTER_AUTH_SECRET;

    if (!clientId || !clientSecret || !redirectUri || !signingKey) {
      throw new ServiceUnavailableException(
        "Google Drive OAuth is not configured",
      );
    }

    const url = new URL(redirectUri);

    if (
      !["https:", "http:"].includes(url.protocol) ||
      (url.protocol === "http:" &&
        url.hostname !== "localhost" &&
        url.hostname !== "127.0.0.1")
    ) {
      throw new ServiceUnavailableException(
        "Invalid Google Drive redirect URI",
      );
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      signingKey,
    };
  }

  createState(context: RequestContext, nonce: string): string {
    const { signingKey } = this.config();

    return createHmac("sha256", signingKey)
      .update(
        [
          "google-drive-oauth-v1",
          context.sessionId,
          context.organizationId,
          context.userId,
          nonce,
        ].join(":"),
      )
      .digest("base64url");
  }

  verifyState(
    context: RequestContext,
    nonce: string | undefined,
    receivedState: string | undefined,
  ): void {
    if (!nonce || !receivedState) {
      throw new UnauthorizedException("Missing OAuth state");
    }

    const expectedBuffer = Buffer.from(this.createState(context, nonce));
    const actualBuffer = Buffer.from(receivedState);

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException("Invalid OAuth state");
    }
  }

  getAuthorizationRequest(context: RequestContext) {
    const nonce = randomBytes(32).toString("base64url");
    const config = this.config();

    const url = new URL(AUTH_ENDPOINT);

    url.searchParams.set("client_id", config.clientId);

    url.searchParams.set("redirect_uri", config.redirectUri);

    url.searchParams.set("response_type", "code");

    url.searchParams.set("scope", GOOGLE_SCOPE);

    url.searchParams.set("access_type", "offline");

    url.searchParams.set("prompt", "consent");

    url.searchParams.set("state", this.createState(context, nonce));

    return {
      url: url.toString(),
      nonce,
    };
  }

  private async fetchJson<T>(url: string, init: RequestInit): Promise<T> {
    let response: globalThis.Response;

    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
    } catch {
      throw new BadGatewayException("Google OAuth request unavailable");
    }

    if (!response.ok) {
      // Do not expose Google response bodies:
      // they may contain sensitive information.
      throw new BadGatewayException("Google OAuth request failed");
    }

    return (await response.json()) as T;
  }

  private async exchangeCode(code: string) {
    const config = this.config();

    return this.fetchJson<GoogleTokenResponse>(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });
  }

  private async getGoogleUser(accessToken: string): Promise<GoogleUser> {
    return this.fetchJson<GoogleUser>(USERINFO_ENDPOINT, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  private async findConnection(organizationId: string) {
    const [connection] = await db
      .select()
      .from(knowledgeConnections)
      .where(
        and(
          eq(knowledgeConnections.organizationId, organizationId),
          eq(knowledgeConnections.provider, "google_drive"),
        ),
      )
      .orderBy(desc(knowledgeConnections.createdAt))
      .limit(1);

    return connection ?? null;
  }

  async status(context: RequestContext) {
    const connection = await this.findConnection(context.organizationId);

    if (!connection) {
      return { connected: false };
    }

    return {
      connected:
        connection.status === "connected" &&
        Boolean(connection.encryptedRefreshToken),
      connection: {
        id: connection.id,
        provider: connection.provider,
        status: connection.status,
        email: connection.accountEmail,
        lastSyncAt: connection.lastSyncAt,
      },
    };
  }

  async complete(context: RequestContext, code: string) {
    if (!code || code.length > 4096) {
      throw new UnauthorizedException("Invalid authorization code");
    }

    const tokens = await this.exchangeCode(code);

    if (!tokens.access_token) {
      throw new BadGatewayException("Google did not return an access token");
    }

    const user = await this.getGoogleUser(tokens.access_token);

    if (!user.sub || !user.email || !user.email_verified) {
      throw new UnauthorizedException("Google account could not be verified");
    }

    const existing = await this.findConnection(context.organizationId);

    if (
      existing?.externalAccountId &&
      existing.externalAccountId !== user.sub
    ) {
      throw new ConflictException(
        "Disconnect the existing Google account first",
      );
    }

    const id = existing?.id ?? randomUUID();

    if (!tokens.refresh_token && !existing?.encryptedRefreshToken) {
      throw new BadGatewayException(
        "Google did not issue an offline refresh token",
      );
    }

    const encrypted = tokens.refresh_token
      ? encryptGoogleToken(tokens.refresh_token, {
          organizationId: context.organizationId,
          connectionId: id,
        })
      : null;

    if (existing) {
      await db
        .update(knowledgeConnections)
        .set({
          externalAccountId: user.sub,
          accountEmail: user.email,
          status: "connected",
          ...(encrypted ?? {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(knowledgeConnections.id, id),
            eq(knowledgeConnections.organizationId, context.organizationId),
          ),
        );
    } else {
      if (!encrypted) {
        throw new BadGatewayException("Refresh token required");
      }

      await db.insert(knowledgeConnections).values({
        id,
        organizationId: context.organizationId,
        provider: "google_drive",
        status: "connected",
        externalAccountId: user.sub,
        accountEmail: user.email,
        ...encrypted,
      });
    }

    return {
      connected: true,
      connectionId: id,
      email: user.email,
    };
  }

  async disconnect(context: RequestContext) {
    const connection = await this.findConnection(context.organizationId);

    if (!connection) {
      return { disconnected: true };
    }

    // This deletes local authorization only.
    // Google-side revocation and RAG index cleanup
    // must be implemented in the next security task.
    // Foreign-key cascade removes external source rows.
    await db
      .delete(knowledgeConnections)
      .where(
        and(
          eq(knowledgeConnections.id, connection.id),
          eq(knowledgeConnections.organizationId, context.organizationId),
        ),
      );

    return { disconnected: true };
  }
}
