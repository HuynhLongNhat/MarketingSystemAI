
import { apiFetch } from "./api-client";

export interface KnowledgePreviewMatch {
  question: string;
  answer: string;
  category: string | null;
  score: number;
  matchedKeywords: string[];
}

export interface KnowledgePreviewResponse {
  query: string;
  totalConsidered: number;
  matchCount: number;
  matches: KnowledgePreviewMatch[];
  documents: {
    status: "ok" | "no_match" | "degraded";
    reason: string | null;
    matches: Array<{
      documentId: string;
      documentTitle: string;
      chunkId: string;
      similarity: number;
      content: string;
    }>;
    diagnostic?: {
      totalChunks: number;
      totalEmbeddings: number;
      matchingProviderModelEmbeddings: number;
      candidatesAfterFilters: number;
      candidatesAboveThreshold: number;
      documentNotReadyCandidates: number;
      threshold: number;
      provider: string | null;
      modelId: string | null;
      topCandidates: Array<{
        documentId: string;
        documentTitle: string;
        chunkId: string;
        content: string;
        similarity: number;
      }>;
      lexicalCandidates: Array<{
        documentId: string;
        documentTitle: string;
        chunkId: string;
        content: string;
        similarity: number;
        lexicalScore?: number;
      }>;
      finalCandidates: Array<{
        documentId: string;
        documentTitle: string;
        chunkId: string;
        content: string;
        similarity: number;
        lexicalScore?: number;
        hybridScore?: number;
      }>;
      noMatchReason:
        | "no_embeddings"
        | "provider_model_mismatch"
        | "document_not_ready"
        | "document_filter"
        | "below_threshold"
        | "provider_error"
        | "database_error"
        | null;
    };
  };
}

export const knowledgePreviewApi = {
  preview(query: string) {
    return apiFetch<KnowledgePreviewResponse>(
      "/knowledge/preview",
      {
        method: "POST",
        body: JSON.stringify({ query }),
      },
    );
  },
};
