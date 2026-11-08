
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
