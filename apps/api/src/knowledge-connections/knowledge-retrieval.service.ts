import { Injectable, Logger } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";

import {
  db,
  knowledgeChunks,
  knowledgeDocuments,
  knowledgeEmbeddings,
} from "@workspace/db/node";

import {
  EmbeddingConfigurationError,
  EmbeddingProviderError,
  KnowledgeEmbeddingService,
} from "./knowledge-embedding.service.js";

const MAX_QUERY_LENGTH = 500;
export const MAX_DOCUMENT_CONTEXT_CHARACTERS = 7_500;
export const MAX_RETRIEVAL_RESULTS = 5;

// This guardrail is deliberately conservative, not presented as an optimum.
// It must be tuned only from measured relevance data for the deployed
// embedding model; automated service tests do not establish semantic quality.
export const MIN_DOCUMENT_SIMILARITY = 0.72;

export type DocumentRetrievalMatch = {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  content: string;
  similarity: number;
};

export type DocumentRetrievalResult = {
  status: "ok" | "no_match" | "degraded";
  reason?: "configuration" | "provider" | "timeout" | "network" | "database";
  matches: DocumentRetrievalMatch[];
  latencyMs: number;
};

@Injectable()
export class KnowledgeRetrievalService {
  private readonly logger = new Logger(KnowledgeRetrievalService.name);

  constructor(
    private readonly embeddings: KnowledgeEmbeddingService,
  ) {}

  async retrieve(input: {
    organizationId: string;
    query: string;
    limit?: number;
  }): Promise<DocumentRetrievalResult> {
    const startedAt = Date.now();
    const query = input.query.trim().slice(0, MAX_QUERY_LENGTH);

    if (!query) {
      return { status: "no_match", matches: [], latencyMs: 0 };
    }

    let queryEmbedding: Awaited<ReturnType<KnowledgeEmbeddingService["embedQuery"]>>;

    try {
      queryEmbedding = await this.embeddings.embedQuery(
        input.organizationId,
        query,
      );
    } catch (error) {
      return this.degraded(input.organizationId, startedAt, error);
    }

    try {
      const vector = `[${queryEmbedding.embedding.join(",")}]`;
      const limit = Math.min(Math.max(input.limit ?? MAX_RETRIEVAL_RESULTS, 1), MAX_RETRIEVAL_RESULTS);

      const rows = await db
        .select({
          documentId: knowledgeDocuments.id,
          documentTitle: knowledgeDocuments.title,
          chunkId: knowledgeChunks.id,
          content: knowledgeChunks.content,
          similarity: sql<number>`1 - (${knowledgeEmbeddings.embedding} <=> ${vector}::vector)`.mapWith(Number),
        })
        .from(knowledgeEmbeddings)
        .innerJoin(
          knowledgeChunks,
          and(
            eq(knowledgeChunks.id, knowledgeEmbeddings.chunkId),
            eq(knowledgeChunks.organizationId, knowledgeEmbeddings.organizationId),
          ),
        )
        .innerJoin(
          knowledgeDocuments,
          and(
            eq(knowledgeDocuments.id, knowledgeChunks.documentId),
            eq(knowledgeDocuments.organizationId, knowledgeChunks.organizationId),
          ),
        )
        .where(and(
          eq(knowledgeEmbeddings.organizationId, input.organizationId),
          eq(knowledgeEmbeddings.provider, queryEmbedding.provider),
          eq(knowledgeEmbeddings.modelId, queryEmbedding.modelId),
          eq(knowledgeDocuments.organizationId, input.organizationId),
          eq(knowledgeDocuments.sourceType, "google_drive"),
          eq(knowledgeDocuments.status, "ready"),
          eq(knowledgeDocuments.embeddingStatus, "completed"),
        ))
        .orderBy(sql`${knowledgeEmbeddings.embedding} <=> ${vector}::vector`)
        .limit(limit);

      const matches: DocumentRetrievalMatch[] = [];
      let characters = 0;
      for (const row of rows) {
        if (row.similarity < MIN_DOCUMENT_SIMILARITY) continue;
        const content = row.content.slice(0, MAX_DOCUMENT_CONTEXT_CHARACTERS - characters);
        if (!content) break;
        matches.push({ ...row, content });
        characters += content.length;
        if (characters >= MAX_DOCUMENT_CONTEXT_CHARACTERS) break;
      }

      this.logger.log(JSON.stringify({
        event: "knowledge.retrieval",
        organizationId: input.organizationId,
        status: matches.length ? "ok" : "no_match",
        count: matches.length,
        latencyMs: Date.now() - startedAt,
      }));

      return {
        status: matches.length ? "ok" : "no_match",
        matches,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return this.degraded(input.organizationId, startedAt, error, "database");
    }
  }

  private degraded(
    organizationId: string,
    startedAt: number,
    error: unknown,
    fallback: DocumentRetrievalResult["reason"] = "provider",
  ): DocumentRetrievalResult {
    const reason =
      error instanceof EmbeddingConfigurationError
        ? "configuration"
        : error instanceof EmbeddingProviderError
          ? error.kind
          : fallback;

    this.logger.warn(JSON.stringify({
      event: "knowledge.retrieval.degraded",
      organizationId,
      reason,
      latencyMs: Date.now() - startedAt,
    }));

    return {
      status: "degraded",
      reason,
      matches: [],
      latencyMs: Date.now() - startedAt,
    };
  }

  formatContext(matches: DocumentRetrievalMatch[]) {
    return matches.map((match) => ({
      source: {
        documentTitle: match.documentTitle,
        documentId: match.documentId,
        chunkId: match.chunkId,
      },
      content: match.content,
    }));
  }
}
