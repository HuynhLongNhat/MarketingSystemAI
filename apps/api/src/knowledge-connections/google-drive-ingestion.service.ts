
import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";

import {
  db,
  knowledgeChunks,
  knowledgeConnections,
  knowledgeDocuments,
  knowledgeExternalSources,
} from "@workspace/db/node";

import {
  GoogleDrivePickerService,
} from "./google-drive-picker.service.js";

import {
  chunkDocumentText,
  extractDocumentText,
  SUPPORTED_DOCUMENT_TYPES,
} from "./knowledge-text-extractor.js";

const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;

type DriveMetadata = {
  id?: string;
  name?: string;
  mimeType?: string;
  version?: string;
  trashed?: boolean;
  capabilities?: {
    canDownload?: boolean;
  };
};

@Injectable()
export class GoogleDriveIngestionService {
  private readonly logger = new Logger(
    GoogleDriveIngestionService.name,
  );

  constructor(
    private readonly google: GoogleDrivePickerService,
  ) {}

  private async googleRequest(
    url: string,
    accessToken: string,
  ): Promise<Response> {
    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(30_000),
        redirect: "error",
      });
    } catch {
      throw new Error(
        "Google Drive request unavailable",
      );
    }

    if (!response.ok) {
      throw new Error(
        `Google Drive request failed: HTTP ${response.status}`,
      );
    }

    return response;
  }

  private async downloadBytes(
    url: string,
    accessToken: string,
  ): Promise<Buffer> {
    const response = await this.googleRequest(
      url,
      accessToken,
    );

    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error(
        "Google Drive returned no file content",
      );
    }

    const chunks: Buffer[] = [];
    let total = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        total += value.byteLength;

        if (total > MAX_DOWNLOAD_BYTES) {
          throw new Error(
            "Document exceeds 20 MB download limit",
          );
        }

        chunks.push(Buffer.from(value));
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }

    return Buffer.concat(chunks);
  }

  private async downloadFile(
    fileId: string,
    token: string,
    mimeType: string,
  ): Promise<Buffer> {
    const encodedId = encodeURIComponent(fileId);

    if (
      mimeType ===
      "application/vnd.google-apps.document"
    ) {
      const url = new URL(
        `https://www.googleapis.com/drive/v3/files/${encodedId}/export`,
      );

      url.searchParams.set(
        "mimeType",
        "text/plain",
      );

      return this.downloadBytes(
        url.toString(),
        token,
      );
    }

    const url = new URL(
      `https://www.googleapis.com/drive/v3/files/${encodedId}`,
    );

    url.searchParams.set("alt", "media");
    url.searchParams.set(
      "supportsAllDrives",
      "true",
    );

    return this.downloadBytes(
      url.toString(),
      token,
    );
  }

  async process(input: {
    organizationId: string;
    sourceId: string;
  }) {
    const { organizationId, sourceId } = input;

    if (!organizationId || !sourceId) {
      throw new Error(
        "Invalid document ingestion identity",
      );
    }

    const [source] = await db
      .update(knowledgeExternalSources)
      .set({
        status: "indexing",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(
            knowledgeExternalSources.id,
            sourceId,
          ),
          eq(
            knowledgeExternalSources.organizationId,
            organizationId,
          ),
          inArray(
            knowledgeExternalSources.status,
            ["pending", "failed"],
          ),
        ),
      )
      .returning();

    if (!source) {
      return {
        skipped: true,
        reason: "Source is not pending or failed",
      };
    }

    try {
      const [connection] = await db
        .select({
          id: knowledgeConnections.id,
          status: knowledgeConnections.status,
        })
        .from(knowledgeConnections)
        .where(
          and(
            eq(
              knowledgeConnections.id,
              source.connectionId,
            ),
            eq(
              knowledgeConnections.organizationId,
              organizationId,
            ),
            eq(
              knowledgeConnections.provider,
              "google_drive",
            ),
          ),
        )
        .limit(1);

      if (
        !connection ||
        connection.status !== "connected"
      ) {
        throw new Error(
          "Google Drive connection unavailable",
        );
      }

      const auth = await this.google.accessToken(
        organizationId,
      );

      if (
        auth.connectionId !== source.connectionId
      ) {
        throw new Error(
          "Google Drive source connection mismatch",
        );
      }

      const metadataUrl = new URL(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(source.externalFileId)}`,
      );

      metadataUrl.searchParams.set(
        "fields",
        "id,name,mimeType,version,trashed,capabilities(canDownload)",
      );

      metadataUrl.searchParams.set(
        "supportsAllDrives",
        "true",
      );

      const metadataResponse =
        await this.googleRequest(
          metadataUrl.toString(),
          auth.token,
        );

      const metadata =
        (await metadataResponse.json()) as DriveMetadata;

      if (
        metadata.id !== source.externalFileId ||
        !metadata.name ||
        !metadata.mimeType ||
        metadata.trashed
      ) {
        throw new Error(
          "Google Drive file is invalid",
        );
      }

      const mimeType = metadata.mimeType;
      const fileName = metadata.name;

      if (
        !SUPPORTED_DOCUMENT_TYPES.some(
          (type) => type === mimeType,
        )
      ) {
        throw new Error(
          "Unsupported document MIME type",
        );
      }

      if (
        metadata.capabilities?.canDownload === false
      ) {
        throw new Error(
          "Google Drive download not permitted",
        );
      }

      const bytes = await this.downloadFile(
        source.externalFileId,
        auth.token,
        mimeType,
      );

      const extractedText =
        await extractDocumentText(
          mimeType,
          bytes,
        );

      const chunks = chunkDocumentText(
        extractedText,
      );

      if (chunks.length === 0) {
        throw new Error(
          "No document chunks generated",
        );
      }

      const documentId = source.id;
      const now = new Date();

      await db.transaction(async (tx) => {
        const [currentSource] = await tx
          .select({
            id: knowledgeExternalSources.id,
            status: knowledgeExternalSources.status,
          })
          .from(knowledgeExternalSources)
          .where(
            and(
              eq(
                knowledgeExternalSources.id,
                sourceId,
              ),
              eq(
                knowledgeExternalSources.organizationId,
                organizationId,
              ),
            ),
          )
          .for("update")
          .limit(1);

        if (
          !currentSource ||
          currentSource.status !== "indexing"
        ) {
          throw new Error(
            "Knowledge source is no longer indexing",
          );
        }

        await tx
          .insert(knowledgeDocuments)
          .values({
            id: documentId,
            organizationId,
            title: fileName,
            sourceType: "google_drive",
            sourceName: fileName,
            mimeType,
            status: "ready",
            errorMessage: null,
            metadata: {
              connectionId: source.connectionId,
              externalFileId:
                source.externalFileId,
              sourceVersion:
                metadata.version ?? null,
            },
          })
          .onConflictDoUpdate({
            target: knowledgeDocuments.id,
            set: {
              title: fileName,
              sourceName: fileName,
              mimeType,
              status: "ready",
              errorMessage: null,
              metadata: {
                connectionId:
                  source.connectionId,
                externalFileId:
                  source.externalFileId,
                sourceVersion:
                  metadata.version ?? null,
              },
              updatedAt: now,
            },
          });

        await tx
          .delete(knowledgeChunks)
          .where(
            and(
              eq(
                knowledgeChunks.documentId,
                documentId,
              ),
              eq(
                knowledgeChunks.organizationId,
                organizationId,
              ),
            ),
          );

        for (
          let offset = 0;
          offset < chunks.length;
          offset += 100
        ) {
          const batch = chunks.slice(
            offset,
            offset + 100,
          );

          await tx
            .insert(knowledgeChunks)
            .values(
              batch.map((content, index) => ({
                id: randomUUID(),
                organizationId,
                documentId,
                chunkIndex: offset + index,
                content,
                metadata: {
                  sourceType: "google_drive",
                  sourceId,
                },
              })),
            );
        }

        await tx
          .update(knowledgeExternalSources)
          .set({
            name: fileName,
            mimeType,
            sourceVersion:
              metadata.version ?? null,
            status: "ready",
            lastIndexedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(
                knowledgeExternalSources.id,
                sourceId,
              ),
              eq(
                knowledgeExternalSources.organizationId,
                organizationId,
              ),
            ),
          );
      });

      this.logger.log(
        JSON.stringify({
          event: "knowledge.ingestion.completed",
          organizationId,
          sourceId,
          chunkCount: chunks.length,
        }),
      );

      return {
        success: true,
        organizationId,
        sourceId,
        documentId,
        chunkCount: chunks.length,
      };
    } catch (error) {
      await db
        .update(knowledgeExternalSources)
        .set({
          status: "failed",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(
              knowledgeExternalSources.id,
              sourceId,
            ),
            eq(
              knowledgeExternalSources.organizationId,
              organizationId,
            ),
            eq(
              knowledgeExternalSources.status,
              "indexing",
            ),
          ),
        );

      this.logger.error(
        JSON.stringify({
          event: "knowledge.ingestion.failed",
          organizationId,
          sourceId,
          message:
            error instanceof Error
              ? error.message.slice(0, 200)
              : "Unknown ingestion error",
        }),
      );

      throw error;
    }
  }
}
