
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

import {
  db,
  knowledgeChunks,
  knowledgeConnections,
  knowledgeDocuments,
  knowledgeEmbeddings,
  knowledgeExternalSources,
} from "@workspace/db/node";

import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type {
  RequestContext,
} from "../auth/request-context.js";

import {
  JobsService,
} from "../jobs/jobs.service.js";

import {
  decryptGoogleToken,
} from "./google-token-crypto.js";

const TOKEN_ENDPOINT =
  "https://oauth2.googleapis.com/token";

const DRIVE_FILES_ENDPOINT =
  "https://www.googleapis.com/drive/v3/files";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.google-apps.document",
  "text/plain",
  "text/markdown",
]);

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
};

type GoogleDriveFile = {
  id?: string;
  name?: string;
  mimeType?: string;
  version?: string;
  trashed?: boolean;
};

@Injectable()
export class GoogleDrivePickerService {
  constructor(
    private readonly jobs: JobsService,
  ) {}

  private pickerAppId(): string {
    const clientId =
      process.env.GOOGLE_CLIENT_ID?.trim();

    const match = clientId?.match(
      /^(\d+)-.+\.apps\.googleusercontent\.com$/,
    );

    if (!match?.[1]) {
      throw new ServiceUnavailableException(
        "Google OAuth client ID is invalid for Google Picker",
      );
    }

    return match[1];
  }

  private async connection(
    organizationId: string,
  ) {
    const [connection] = await db
      .select()
      .from(knowledgeConnections)
      .where(
        and(
          eq(
            knowledgeConnections.organizationId,
            organizationId,
          ),
          eq(
            knowledgeConnections.provider,
            "google_drive",
          ),
          eq(
            knowledgeConnections.status,
            "connected",
          ),
        ),
      )
      .orderBy(desc(knowledgeConnections.createdAt))
      .limit(1);

    if (
      !connection ||
      !connection.encryptedRefreshToken ||
      !connection.refreshTokenIv ||
      !connection.refreshTokenAuthTag ||
      !connection.tokenKeyVersion
    ) {
      throw new NotFoundException(
        "Google Drive connection is not available",
      );
    }

    return connection;
  }

  async accessToken(
    organizationId: string,
  ) {
    const connection = await this.connection(
      organizationId,
    );

    const clientId =
      process.env.GOOGLE_CLIENT_ID?.trim();

    const clientSecret =
      process.env.GOOGLE_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        "Google Drive credentials are missing",
      );
    }

    const {
      encryptedRefreshToken,
      refreshTokenIv,
      refreshTokenAuthTag,
      tokenKeyVersion,
    } = connection;

    if (
      !encryptedRefreshToken ||
      !refreshTokenIv ||
      !refreshTokenAuthTag ||
      !tokenKeyVersion
    ) {
      throw new UnauthorizedException(
        "Google Drive credentials are incomplete",
      );
    }

    const refreshToken = decryptGoogleToken(
      {
        encryptedRefreshToken,
        refreshTokenIv,
        refreshTokenAuthTag,
        tokenKeyVersion,
      },
      {
        organizationId,
        connectionId: connection.id,
      },
    );

    let response: Response;

    try {
      response = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
    } catch {
      throw new BadGatewayException(
        "Google token service unavailable",
      );
    }

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as {
        error?: string;
      };

      console.warn("Google OAuth refresh failed", {
        status: response.status,
        error: errorData.error ?? "unknown",
      });

      if (errorData.error === "invalid_grant") {
        await db
          .update(knowledgeConnections)
          .set({
            status: "reauthorization_required",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(knowledgeConnections.id, connection.id),
              eq(
                knowledgeConnections.organizationId,
                organizationId,
              ),
            ),
          );

        throw new UnauthorizedException(
          "Google Drive must be reconnected",
        );
      }

      if (errorData.error === "invalid_client") {
        throw new ServiceUnavailableException(
          "Google OAuth client credentials are invalid",
        );
      }

      throw new BadGatewayException(
        "Unable to refresh Google access token",
      );
    }

    const data =
      (await response.json()) as GoogleTokenResponse;

    if (!data.access_token) {
      throw new BadGatewayException(
        "Google returned no access token",
      );
    }

    return {
      connectionId: connection.id,
      token: data.access_token,
      expiresIn: Math.min(
        Math.max(data.expires_in ?? 3600, 1),
        3600,
      ),
    };
  }

  async pickerToken(
    context: RequestContext,
  ) {
    const token = await this.accessToken(
      context.organizationId,
    );

    return {
      accessToken: token.token,
      expiresIn: token.expiresIn,
      appId: this.pickerAppId(),
    };
  }

  private async getGoogleFile(
    accessToken: string,
    fileId: string,
  ): Promise<GoogleDriveFile> {
    if (
      !/^[A-Za-z0-9_-]{5,200}$/.test(fileId)
    ) {
      throw new BadRequestException(
        "Invalid Drive file ID",
      );
    }

    const url = new URL(
      `${DRIVE_FILES_ENDPOINT}/${encodeURIComponent(fileId)}`,
    );

    url.searchParams.set(
      "fields",
      "id,name,mimeType,version,trashed",
    );

    url.searchParams.set(
      "supportsAllDrives",
      "true",
    );

    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
    } catch {
      throw new BadGatewayException(
        "Google Drive request unavailable",
      );
    }

    if (
      response.status === 403 ||
      response.status === 404
    ) {
      const body = (await response
        .json()
        .catch(() => null)) as {
        error?: {
          errors?: Array<{
            reason?: string;
          }>;
        };
      } | null;

      const reason =
        body?.error?.errors?.[0]?.reason;

      const safeReasons = new Set([
        "appNotAuthorizedToFile",
        "notFound",
        "insufficientFilePermissions",
        "insufficientPermissions",
      ]);

      console.warn(
        "Google Drive file access denied",
        {
          status: response.status,
          reason: safeReasons.has(reason ?? "")
            ? reason
            : "unknown",
        },
      );

      throw new BadRequestException(
        "File is unavailable or permission was not granted",
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        "Could not verify Google Drive file",
      );
    }

    return (
      await response.json()
    ) as GoogleDriveFile;
  }

  async saveSelectedFiles(
    context: RequestContext,
    fileIds: string[],
  ) {
    if (
      !Array.isArray(fileIds) ||
      fileIds.length === 0 ||
      fileIds.length > 20 ||
      fileIds.some((id) => typeof id !== "string")
    ) {
      throw new BadRequestException(
        "Select between 1 and 20 files",
      );
    }

    const ids = [...new Set(fileIds)];

    if (ids.length !== fileIds.length) {
      throw new BadRequestException(
        "Duplicate file IDs are not allowed",
      );
    }

    const { token, connectionId } =
      await this.accessToken(
        context.organizationId,
      );

    const selected = [];

    for (const fileId of ids) {
      const file = await this.getGoogleFile(
        token,
        fileId,
      );

      if (
        !file.id ||
        !file.name ||
        file.trashed ||
        !file.mimeType ||
        !ALLOWED_MIME_TYPES.has(file.mimeType)
      ) {
        throw new BadRequestException(
          "Unsupported or deleted Google Drive file",
        );
      }

      const [record] = await db
        .insert(knowledgeExternalSources)
        .values({
          id: randomUUID(),
          organizationId: context.organizationId,
          connectionId,
          externalFileId: file.id,
          name: file.name,
          mimeType: file.mimeType,
          sourceVersion: file.version ?? null,
          status: "pending",
        })
        .onConflictDoUpdate({
          target: [
            knowledgeExternalSources.connectionId,
            knowledgeExternalSources.externalFileId,
          ],
          set: {
            name: file.name,
            mimeType: file.mimeType,
            sourceVersion: file.version ?? null,
            status: "pending",
            updatedAt: new Date(),
          },
        })
        .returning({
          id: knowledgeExternalSources.id,
          name: knowledgeExternalSources.name,
          mimeType: knowledgeExternalSources.mimeType,
          status: knowledgeExternalSources.status,
        });

      if (record) {
        selected.push(record);

        await this.jobs.enqueueKnowledgeSource({
          organizationId: context.organizationId,
          sourceId: record.id,
        });
      }
    }

    return {
      success: true,
      selected,
      message: "Documents queued for indexing",
    };
  }

  async listSources(
    context: RequestContext,
  ) {
    return db
      .select({
        id: knowledgeExternalSources.id,
        name: knowledgeExternalSources.name,
        mimeType: knowledgeExternalSources.mimeType,
        status: knowledgeExternalSources.status,
        lastIndexedAt: knowledgeExternalSources.lastIndexedAt,
        chunkCount: sql<number>`count(distinct ${knowledgeChunks.id})`.mapWith(Number),
        embeddingCount: sql<number>`count(${knowledgeEmbeddings.id})`.mapWith(Number),
        embeddingProvider: sql<string | null>`max(${knowledgeEmbeddings.provider})`,
      })
      .from(knowledgeExternalSources)
      .leftJoin(
        knowledgeDocuments,
        and(
          eq(knowledgeDocuments.id, knowledgeExternalSources.id),
          eq(
            knowledgeDocuments.organizationId,
            knowledgeExternalSources.organizationId,
          ),
        ),
      )
      .leftJoin(
        knowledgeChunks,
        and(
          eq(knowledgeChunks.documentId, knowledgeDocuments.id),
          eq(
            knowledgeChunks.organizationId,
            knowledgeDocuments.organizationId,
          ),
        ),
      )
      .leftJoin(
        knowledgeEmbeddings,
        and(
          eq(knowledgeEmbeddings.chunkId, knowledgeChunks.id),
          eq(
            knowledgeEmbeddings.organizationId,
            knowledgeChunks.organizationId,
          ),
        ),
      )
      .where(
        eq(
          knowledgeExternalSources.organizationId,
          context.organizationId,
        ),
      )
      .orderBy(
        desc(knowledgeExternalSources.createdAt),
      )
      .groupBy(
        knowledgeExternalSources.id,
        knowledgeExternalSources.name,
        knowledgeExternalSources.mimeType,
        knowledgeExternalSources.status,
        knowledgeExternalSources.lastIndexedAt,
        knowledgeExternalSources.createdAt,
      );
  }
}
