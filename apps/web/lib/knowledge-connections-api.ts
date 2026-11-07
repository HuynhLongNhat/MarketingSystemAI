import { apiFetch } from "@/lib/api-client";

export type GoogleDriveSource = {
  id: string;
  name: string;
  mimeType: string | null;
  status: "pending" | "indexing" | "ready" | "failed" | "removed";
  documentStatus: string | null;
  errorMessage: string | null;
  embeddingStatus: "waiting" | "processing" | "completed" | "failed" | null;
  embeddingErrorMessage: string | null;
  embeddingCompletedAt: string | null;
  lastIndexedAt: string | null;
  chunkCount: number;
  embeddingCount: number;
  embeddingProvider: string | null;
  embeddingModel: string | null;
};

export type GoogleDriveSourceLimits = {
  supportedFormats: readonly string[];
  maxDownloadBytes: number;
  maxTextCharacters: number;
};

const GOOGLE_PATH = "/knowledge-connections/google";

export const knowledgeConnectionsApi = {
  listGoogleSources: () =>
    apiFetch<GoogleDriveSource[]>(`${GOOGLE_PATH}/sources`),

  getGoogleSourceLimits: () =>
    apiFetch<GoogleDriveSourceLimits>(`${GOOGLE_PATH}/sources/limits`),

  removeGoogleSource: (sourceId: string) =>
    apiFetch<{ success: true; sourceId: string }>(
      `${GOOGLE_PATH}/sources/${encodeURIComponent(sourceId)}`,
      { method: "DELETE" },
    ),

  retryGoogleSource: (sourceId: string) =>
    apiFetch<{
      success: true;
      sourceId: string;
      jobId?: string;
      alreadyQueued?: boolean;
    }>(
      `${GOOGLE_PATH}/sources/${encodeURIComponent(sourceId)}/retry`,
      { method: "POST" },
    ),

  backfillEmbeddings: () =>
    apiFetch<{
      success: boolean;
      queuedCount: number;
      message: string;
    }>("/knowledge-connections/embeddings/backfill", {
      method: "POST",
    }),
};
