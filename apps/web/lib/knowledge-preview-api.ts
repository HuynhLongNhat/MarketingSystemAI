
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
