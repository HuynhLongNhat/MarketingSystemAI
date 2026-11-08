import { Injectable, Logger } from "@nestjs/common";
import { and, eq, ne, or, sql } from "drizzle-orm";

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
import {
  rankLexicalCandidates,
  reciprocalRankFusion,
} from "./hybrid-ranking.js";

const MAX_QUERY_LENGTH = 500;
export const MAX_DOCUMENT_CONTEXT_CHARACTERS = 7_500;
export const MAX_RETRIEVAL_RESULTS = 5;
const MAX_HYBRID_CANDIDATES = 20;
const MIN_SEMANTIC_CANDIDATE_SIMILARITY = 0.35;

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
  lexicalScore?: number;
  hybridScore?: number;
};

export type DocumentRetrievalResult = {
  status: "ok" | "no_match" | "degraded";
  reason?: "configuration" | "provider" | "timeout" | "network" | "database";
  matches: DocumentRetrievalMatch[];
  latencyMs: number;
  diagnostic?: DocumentRetrievalDiagnostic;
};

export type DocumentRetrievalDiagnostic = {
  totalChunks: number;
  totalEmbeddings: number;
  matchingProviderModelEmbeddings: number;
  candidatesAfterFilters: number;
  candidatesAboveThreshold: number;
  documentNotReadyCandidates: number;
  threshold: number;
  provider: string | null;
  modelId: string | null;
  topCandidates: DocumentRetrievalMatch[];
  lexicalCandidates: DocumentRetrievalMatch[];
  finalCandidates: DocumentRetrievalMatch[];
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
    diagnostic?: boolean;
  }): Promise<DocumentRetrievalResult> {
    const startedAt = Date.now();
    const query = input.query.trim().slice(0, MAX_QUERY_LENGTH);

    if (!query) {
      return { status: "no_match", matches: [], latencyMs: 0 };
    }

    let lexicalCandidates: DocumentRetrievalMatch[];

    try {
      lexicalCandidates = await this.loadLexicalCandidates(input.organizationId);
    } catch (error) {
      return this.degraded(input.organizationId, startedAt, error, "database", input.diagnostic);
    }

    const lexical = rankLexicalCandidates(lexicalCandidates, query);
    let queryEmbedding: Awaited<ReturnType<KnowledgeEmbeddingService["embedQuery"]>>;

    try {
      queryEmbedding = await this.embeddings.embedQuery(
        input.organizationId,
        query,
      );
    } catch (error) {
      if (lexical.length > 0) {
        return {
          status: "ok",
          matches: lexical.slice(0, input.limit ?? MAX_RETRIEVAL_RESULTS),
          latencyMs: Date.now() - startedAt,
        };
      }
      return this.degraded(input.organizationId, startedAt, error, "provider", input.diagnostic);
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
        .limit(MAX_HYBRID_CANDIDATES);

      const matches: DocumentRetrievalMatch[] = [];
      let characters = 0;
      const semantic = rows.filter(
        (row) => row.similarity >= MIN_SEMANTIC_CANDIDATE_SIMILARITY,
      );
      const hybrid = reciprocalRankFusion(semantic, lexical, limit);
      for (const row of hybrid) {
        const content = row.content.slice(0, MAX_DOCUMENT_CONTEXT_CHARACTERS - characters);
        if (!content) break;
        matches.push({ ...row, content });
        characters += content.length;
        if (characters >= MAX_DOCUMENT_CONTEXT_CHARACTERS) break;
      }

      const diagnostic = input.diagnostic
        ? await this.collectDiagnostic({
            organizationId: input.organizationId,
            provider: queryEmbedding.provider,
            modelId: queryEmbedding.modelId,
          topCandidates: rows.slice(0, MAX_RETRIEVAL_RESULTS),
            lexicalCandidates: lexical.slice(0, MAX_RETRIEVAL_RESULTS),
            finalCandidates: hybrid.slice(0, MAX_RETRIEVAL_RESULTS),
            candidatesAboveThreshold: rows.filter(
              (row) => row.similarity >= MIN_DOCUMENT_SIMILARITY,
            ).length,
          })
        : undefined;

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
        diagnostic,
      };
    } catch (error) {
      return this.degraded(input.organizationId, startedAt, error, "database", input.diagnostic);
    }
  }

  private async loadLexicalCandidates(
    organizationId: string,
  ): Promise<DocumentRetrievalMatch[]> {
    const rows = await db
      .select({
        documentId: knowledgeDocuments.id,
        documentTitle: knowledgeDocuments.title,
        chunkId: knowledgeChunks.id,
        content: knowledgeChunks.content,
      })
      .from(knowledgeChunks)
      .innerJoin(
        knowledgeDocuments,
        and(
          eq(knowledgeDocuments.id, knowledgeChunks.documentId),
          eq(knowledgeDocuments.organizationId, knowledgeChunks.organizationId),
        ),
      )
      .where(and(
        eq(knowledgeChunks.organizationId, organizationId),
        eq(knowledgeDocuments.organizationId, organizationId),
        eq(knowledgeDocuments.sourceType, "google_drive"),
        eq(knowledgeDocuments.status, "ready"),
      ))
      .limit(200);

    return rows.map((row) => ({ ...row, similarity: 0 }));
  }

  private async collectDiagnostic(input: {
    organizationId: string;
    provider: string;
    modelId: string;
    topCandidates: DocumentRetrievalMatch[];
    lexicalCandidates: DocumentRetrievalMatch[];
    finalCandidates: DocumentRetrievalMatch[];
    candidatesAboveThreshold: number;
  }): Promise<DocumentRetrievalDiagnostic> {
    const [totals, matching, filtered, notReady] = await Promise.all([
      db
        .select({
          totalChunks: sql<number>`count(distinct ${knowledgeChunks.id})`.mapWith(Number),
          totalEmbeddings: sql<number>`count(${knowledgeEmbeddings.id})`.mapWith(Number),
        })
        .from(knowledgeChunks)
        .leftJoin(
          knowledgeEmbeddings,
          and(
            eq(knowledgeEmbeddings.chunkId, knowledgeChunks.id),
            eq(knowledgeEmbeddings.organizationId, knowledgeChunks.organizationId),
          ),
        )
        .where(eq(knowledgeChunks.organizationId, input.organizationId)),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(knowledgeEmbeddings)
        .where(and(
          eq(knowledgeEmbeddings.organizationId, input.organizationId),
          eq(knowledgeEmbeddings.provider, input.provider),
          eq(knowledgeEmbeddings.modelId, input.modelId),
        )),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
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
          eq(knowledgeEmbeddings.provider, input.provider),
          eq(knowledgeEmbeddings.modelId, input.modelId),
          eq(knowledgeDocuments.sourceType, "google_drive"),
          eq(knowledgeDocuments.status, "ready"),
          eq(knowledgeDocuments.embeddingStatus, "completed"),
        )),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
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
          eq(knowledgeEmbeddings.provider, input.provider),
          eq(knowledgeEmbeddings.modelId, input.modelId),
          or(
            ne(knowledgeDocuments.status, "ready"),
            ne(knowledgeDocuments.embeddingStatus, "completed"),
          ),
        )),
    ]);

    const totalChunks = totals[0]?.totalChunks ?? 0;
    const totalEmbeddings = totals[0]?.totalEmbeddings ?? 0;
    const matchingProviderModelEmbeddings = matching[0]?.count ?? 0;
    const candidatesAfterFilters = filtered[0]?.count ?? 0;
    const documentNotReadyCandidates = notReady[0]?.count ?? 0;
    const noMatchReason = this.diagnosticNoMatchReason({
      totalEmbeddings,
      matchingProviderModelEmbeddings,
      candidatesAfterFilters,
      documentNotReadyCandidates,
      candidatesAboveThreshold: input.candidatesAboveThreshold,
    });

    return {
      totalChunks,
      totalEmbeddings,
      matchingProviderModelEmbeddings,
      candidatesAfterFilters,
      candidatesAboveThreshold: input.candidatesAboveThreshold,
      documentNotReadyCandidates,
      threshold: MIN_DOCUMENT_SIMILARITY,
      provider: input.provider,
      modelId: input.modelId,
      topCandidates: input.topCandidates,
      lexicalCandidates: input.lexicalCandidates,
      finalCandidates: input.finalCandidates,
      noMatchReason,
    };
  }

  private diagnosticNoMatchReason(input: {
    totalEmbeddings: number;
    matchingProviderModelEmbeddings: number;
    candidatesAfterFilters: number;
    documentNotReadyCandidates: number;
    candidatesAboveThreshold: number;
  }): DocumentRetrievalDiagnostic["noMatchReason"] {
    if (input.totalEmbeddings === 0) return "no_embeddings";
    if (input.matchingProviderModelEmbeddings === 0) return "provider_model_mismatch";
    if (input.candidatesAfterFilters === 0) {
      return input.documentNotReadyCandidates > 0
        ? "document_not_ready"
        : "document_filter";
    }
    if (input.candidatesAboveThreshold === 0) return "below_threshold";
    return null;
  }

  private degraded(
    organizationId: string,
    startedAt: number,
    error: unknown,
    fallback: DocumentRetrievalResult["reason"] = "provider",
    diagnostic = false,
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
      diagnostic: diagnostic
        ? {
            totalChunks: 0,
            totalEmbeddings: 0,
            matchingProviderModelEmbeddings: 0,
            candidatesAfterFilters: 0,
            candidatesAboveThreshold: 0,
            documentNotReadyCandidates: 0,
            threshold: MIN_DOCUMENT_SIMILARITY,
            provider: null,
            modelId: null,
            topCandidates: [],
            lexicalCandidates: [],
            finalCandidates: [],
            noMatchReason: fallback === "database" ? "database_error" : "provider_error",
          }
        : undefined,
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
