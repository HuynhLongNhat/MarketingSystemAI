
import { apiFetch } from "./api-client";

export interface KnowledgeEntry {
  id: string;
  organizationId: string;
  question: string;
  answer: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeInput {
  question: string;
  answer: string;
  category?: string;
}

export const knowledgeApi = {
  list() {
    return apiFetch<KnowledgeEntry[]>("/knowledge");
  },

  get(id: string) {
    return apiFetch<KnowledgeEntry>(
      `/knowledge/${encodeURIComponent(id)}`,
    );
  },

  create(input: KnowledgeInput) {
    return apiFetch<KnowledgeEntry>("/knowledge", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  update(id: string, input: Partial<KnowledgeInput>) {
    return apiFetch<KnowledgeEntry>(
      `/knowledge/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
  },

  remove(id: string) {
    return apiFetch<{ success: boolean; id: string }>(
      `/knowledge/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  },
};
