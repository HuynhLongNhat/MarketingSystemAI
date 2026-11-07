
import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

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
import {
  MAX_DOCUMENT_DOWNLOAD_BYTES,
} from "./knowledge-ingestion-limits.js";

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

  private safeFailureMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : "";

    if (message === "Document exceeds 20 MB download limit") {
      return "File vượt giới hạn tải xuống 20 MB.";
    }

    if (message === "Document exceeds maximum text length") {
      return "Nội dung sau khi trích xuất vượt 300.000 ký tự.";
    }

    if (message === "Document contains no extractable text") {
      return "Không thể trích xuất văn bản từ file.";
    }

    if (message === "Unsupported document MIME type") {
      return "Định dạng file không được hỗ trợ.";
    }

    if (message === "Google Drive download not permitted") {
      return "Google Drive không cấp quyền tải nội dung file này.";
    }

    if (message === "No document chunks generated") {
      return "Không thể tạo đoạn nội dung để index.";
    }

    if (
      message.startsWith("Google Drive request failed: HTTP 401") ||
      message.startsWith("Google Drive request failed: HTTP 403") ||
      message.startsWith("Google Drive request failed: HTTP 404")
    ) {
      return "Không thể đọc file từ Google Drive. Kiểm tra quyền truy cập rồi thử lại.";
    }

    return "Google Drive indexing failed. Retry this source.";
  }

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

        if (total > MAX_DOCUMENT_DOWNLOAD_BYTES) {
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
    generation: number;
    token: string;
  }) {
    const { organizationId, sourceId, generation, token } = input;

    if (!organizationId || !sourceId || !Number.isInteger(generation) || !token) {
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
          eq(knowledgeExternalSources.status, "pending"),
          eq(knowledgeExternalSources.ingestionGeneration, generation),
          eq(knowledgeExternalSources.ingestionToken, token),
        ),
      )
      .returning();

    if (!source) {
      return {
        skipped: true,
        reason: "Source is not pending or failed",
      };
    }

    // Preserve the source as the job authority, while making an existing
    // document's lifecycle visible during a re-index.
    await db
      .update(knowledgeDocuments)
      .set({
        status: "pending",
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(knowledgeDocuments.id, sourceId),
          eq(knowledgeDocuments.organizationId, organizationId),
        ),
      );

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
            ingestionGeneration:
              knowledgeExternalSources.ingestionGeneration,
            ingestionToken: knowledgeExternalSources.ingestionToken,
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
          currentSource.status !== "indexing" ||
          currentSource.ingestionGeneration !== generation ||
          currentSource.ingestionToken !== token
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
            sourceGeneration: generation,
            embeddingStatus: "waiting",
            embeddingToken: null,
            embeddingQueuedAt: null,
            embeddingStartedAt: null,
            embeddingCompletedAt: null,
            embeddingErrorMessage: null,
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
              sourceGeneration: generation,
              embeddingStatus: "waiting",
              embeddingToken: null,
              embeddingQueuedAt: null,
              embeddingStartedAt: null,
              embeddingCompletedAt: null,
              embeddingErrorMessage: null,
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
            ingestionToken: null,
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
      const [failedSource] = await db
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
            eq(knowledgeExternalSources.ingestionGeneration, generation),
            eq(knowledgeExternalSources.ingestionToken, token),
          ),
        )
        .returning({ id: knowledgeExternalSources.id });

      // Do not overwrite a retry or a deletion that happened while the
      // external Drive request was in flight.
      if (failedSource) {
        await db
          .insert(knowledgeDocuments)
          .values({
            id: sourceId,
            organizationId,
            title: source.name,
            sourceType: "google_drive",
            sourceName: source.name,
            mimeType: source.mimeType,
            status: "failed",
            sourceGeneration: generation,
            // Keep UI/API errors safe; detailed diagnostics stay in logs.
            errorMessage: this.safeFailureMessage(error),
            metadata: {
              connectionId: source.connectionId,
              externalFileId: source.externalFileId,
              sourceVersion: source.sourceVersion,
            },
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: knowledgeDocuments.id,
            set: {
              status: "failed",
              errorMessage: this.safeFailureMessage(error),
              updatedAt: new Date(),
            },
          });
      }

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
