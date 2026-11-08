
import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";

import {
  aiModelDefaults,
  aiProviderConnections,
  db,
  KNOWLEDGE_EMBEDDING_DIMENSIONS,
  knowledgeChunks,
  knowledgeDocuments,
  knowledgeEmbeddings,
} from "@workspace/db/node";

import {
  decryptCredential,
} from "../ai-credentials/credential-crypto.js";
import {
  getEmbeddingModelDefinition,
  type EmbeddingModelDefinition,
} from "../ai-providers/provider-registry.js";
import {
  isFreshKnowledgeJob,
} from "./knowledge-job-ownership.js";

const EMBEDDING_PURPOSE = "embedding";
const BATCH_SIZE = 20;

type EmbeddingResponse = {
  data?: Array<{
    index: number;
    embedding: number[];
  }>;
};

export class EmbeddingConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmbeddingConfigurationError";
  }
}

type EmbeddingConfiguration = {
  connectionId: string;
  provider: EmbeddingModelDefinition["provider"];
  modelId: string;
  dimensions: number;
  endpoint: string;
  apiKey: string;
};

export class EmbeddingProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly kind: "timeout" | "network" | "provider" = "provider",
  ) {
    super(message);
    this.name = "EmbeddingProviderError";
  }
}

@Injectable()
export class KnowledgeEmbeddingService {
  private readonly logger = new Logger(
    KnowledgeEmbeddingService.name,
  );

  private async configuration(
    organizationId: string,
  ): Promise<EmbeddingConfiguration> {
    const [selection] = await db
      .select({
        connectionId: aiProviderConnections.id,
        provider: aiProviderConnections.provider,
        enabled: aiProviderConnections.enabled,
        encryptedApiKey: aiProviderConnections.encryptedApiKey,
        keyIv: aiProviderConnections.keyIv,
        keyAuthTag: aiProviderConnections.keyAuthTag,
        keyVersion: aiProviderConnections.keyVersion,
        modelId: aiModelDefaults.modelId,
      })
      .from(aiModelDefaults)
      .innerJoin(
        aiProviderConnections,
        and(
          eq(aiModelDefaults.connectionId, aiProviderConnections.id),
          eq(
            aiModelDefaults.organizationId,
            aiProviderConnections.organizationId,
          ),
        ),
      )
      .where(
        and(
          eq(aiModelDefaults.organizationId, organizationId),
          eq(aiModelDefaults.purpose, EMBEDDING_PURPOSE),
        ),
      )
      .limit(1);

    if (!selection) {
      throw new EmbeddingConfigurationError(
        "Configure an embedding provider and model before embedding documents",
      );
    }

    if (!selection.enabled) {
      throw new EmbeddingConfigurationError(
        "The configured embedding provider connection is disabled",
      );
    }

    if (selection.keyVersion !== "v1") {
      throw new EmbeddingConfigurationError(
        "The configured embedding provider credential is unavailable",
      );
    }

    const model = getEmbeddingModelDefinition(
      selection.provider,
      selection.modelId,
    );

    if (
      !model ||
      model.dimensions !== KNOWLEDGE_EMBEDDING_DIMENSIONS
    ) {
      throw new EmbeddingConfigurationError(
        "The configured embedding model is not compatible with 1536-dimensional knowledge vectors",
      );
    }

    let apiKey: string;

    try {
      apiKey = decryptCredential(
        {
          encryptedApiKey: selection.encryptedApiKey,
          keyIv: selection.keyIv,
          keyAuthTag: selection.keyAuthTag,
          keyVersion: "v1",
        },
        {
          organizationId,
          connectionId: selection.connectionId,
          provider: selection.provider,
        },
      );
    } catch {
      throw new EmbeddingConfigurationError(
        "The configured embedding provider credential is unavailable",
      );
    }

    return {
      connectionId: selection.connectionId,
      provider: model.provider,
      modelId: model.modelId,
      dimensions: model.dimensions,
      endpoint: model.endpoint,
      apiKey,
    };
  }

  async assertConfiguration(organizationId: string): Promise<void> {
    await this.configuration(organizationId);
  }

  async prepareJob(input: {
    organizationId: string;
    documentId: string;
  }) {
    const { organizationId, documentId } = input;

    return db.transaction(async (tx) => {
      const [document] = await tx
        .select({
          id: knowledgeDocuments.id,
          sourceGeneration: knowledgeDocuments.sourceGeneration,
          embeddingStatus: knowledgeDocuments.embeddingStatus,
          embeddingToken: knowledgeDocuments.embeddingToken,
          embeddingQueuedAt: knowledgeDocuments.embeddingQueuedAt,
          embeddingStartedAt: knowledgeDocuments.embeddingStartedAt,
        })
        .from(knowledgeDocuments)
        .where(and(eq(knowledgeDocuments.id, documentId), eq(knowledgeDocuments.organizationId, organizationId), eq(knowledgeDocuments.status, "ready")))
        .for("update")
        .limit(1);

      if (!document) return null;

      const lastActivity = document.embeddingStartedAt ?? document.embeddingQueuedAt;
      const active =
        (document.embeddingStatus === "waiting" || document.embeddingStatus === "processing") &&
        lastActivity &&
        isFreshKnowledgeJob(lastActivity);

      if (active && document.embeddingToken) {
        return { token: document.embeddingToken, sourceGeneration: document.sourceGeneration, alreadyQueued: true };
      }

      const token = randomUUID();
      await tx
        .update(knowledgeDocuments)
        .set({
          embeddingStatus: "waiting",
          embeddingToken: token,
          embeddingQueuedAt: new Date(),
          embeddingStartedAt: null,
          embeddingCompletedAt: null,
          embeddingErrorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(knowledgeDocuments.id, document.id));

      return { token, sourceGeneration: document.sourceGeneration, alreadyQueued: false };
    });
  }

  async markQueueFailed(input: {
    organizationId: string;
    documentId: string;
    sourceGeneration: number;
    token: string;
  }) {
    await db.update(knowledgeDocuments).set({
      embeddingStatus: "failed",
      embeddingErrorMessage: "Unable to queue embedding. Retry backfill.",
      embeddingToken: null,
      updatedAt: new Date(),
    }).where(and(
      eq(knowledgeDocuments.id, input.documentId),
      eq(knowledgeDocuments.organizationId, input.organizationId),
      eq(knowledgeDocuments.sourceGeneration, input.sourceGeneration),
      eq(knowledgeDocuments.embeddingToken, input.token),
    ));
  }

  async markFailed(input: {
    organizationId: string;
    documentId: string;
    sourceGeneration: number;
    token: string;
    message: string;
  }) {
    await db.update(knowledgeDocuments).set({
      embeddingStatus: "failed",
      embeddingErrorMessage: input.message,
      embeddingToken: null,
      updatedAt: new Date(),
    }).where(and(
      eq(knowledgeDocuments.id, input.documentId),
      eq(knowledgeDocuments.organizationId, input.organizationId),
      eq(knowledgeDocuments.sourceGeneration, input.sourceGeneration),
      eq(knowledgeDocuments.embeddingToken, input.token),
      eq(knowledgeDocuments.embeddingStatus, "processing"),
    ));
  }

  private async embed(
    contents: string[],
    configuration: EmbeddingConfiguration,
    timeoutMs = 45_000,
  ): Promise<number[][]> {
    let response: Response;

    try {
      response = await fetch(configuration.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${configuration.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: configuration.modelId,
          input: contents,
          dimensions: configuration.dimensions,
        }),
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "error",
      });
    } catch (error) {
      const kind =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
          ? "timeout"
          : error instanceof TypeError
            ? "network"
            : "provider";

      throw new EmbeddingProviderError(
        kind === "timeout"
          ? "Embedding provider request timed out"
          : "Embedding provider is temporarily unavailable",
        true,
        kind,
      );
    }

    if (!response.ok) {
      const retryable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;

      const message =
        response.status === 401 || response.status === 403
          ? "Embedding provider rejected the configured credential"
          : response.status === 402
            ? "Embedding provider has insufficient credits"
            : response.status === 400 ||
                response.status === 404 ||
                response.status === 413
              ? "Embedding provider rejected the configured model or request"
              : "Embedding provider request failed";

      // Never log the API key, provider response body or customer document text.
      throw new EmbeddingProviderError(
        message,
        retryable,
        "provider",
      );
    }

    const payload =
      (await response.json()) as EmbeddingResponse;

    if (!Array.isArray(payload.data)) {
      throw new Error("Invalid embedding response");
    }

    const ordered = [...payload.data].sort(
      (a, b) => a.index - b.index,
    );

    if (ordered.length !== contents.length) {
      throw new Error("Embedding count mismatch");
    }

    return ordered.map((item, index) => {
      if (
        item.index !== index ||
        !Array.isArray(item.embedding) ||
        item.embedding.length !==
          configuration.dimensions ||
        item.embedding.some(
          (value) =>
            typeof value !== "number" ||
            !Number.isFinite(value),
        )
      ) {
        throw new Error("Invalid embedding vector");
      }

      return item.embedding;
    });
  }

  async process(input: {
    organizationId: string;
    documentId: string;
    sourceGeneration: number;
    token: string;
  }) {
    const { organizationId, documentId, sourceGeneration, token } = input;

    if (!organizationId || !documentId || !Number.isInteger(sourceGeneration) || !token) {
      throw new Error("Invalid embedding job identity");
    }

    const [document] = await db
      .update(knowledgeDocuments)
      .set({
        embeddingStatus: "processing",
        embeddingStartedAt: new Date(),
        embeddingErrorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(knowledgeDocuments.id, documentId),
          eq(
            knowledgeDocuments.organizationId,
            organizationId,
          ),
          eq(knowledgeDocuments.status, "ready"),
          eq(knowledgeDocuments.sourceGeneration, sourceGeneration),
          eq(knowledgeDocuments.embeddingStatus, "waiting"),
          eq(knowledgeDocuments.embeddingToken, token),
        ),
      )
      .returning({ id: knowledgeDocuments.id });

    if (!document) {
      return {
        skipped: true,
        reason: "Document is not ready or unavailable",
      };
    }

    const chunks = await db
      .select({
        id: knowledgeChunks.id,
        content: knowledgeChunks.content,
      })
      .from(knowledgeChunks)
      .where(
        and(
          eq(knowledgeChunks.organizationId, organizationId),
          eq(knowledgeChunks.documentId, documentId),
        ),
      )
      .orderBy(asc(knowledgeChunks.chunkIndex));

    if (chunks.length === 0) {
      return {
        skipped: true,
        reason: "Document contains no chunks",
      };
    }

    const configuration = await this.configuration(organizationId);

    let embedded = 0;

    for (
      let offset = 0;
      offset < chunks.length;
      offset += BATCH_SIZE
    ) {
      const batch = chunks.slice(offset, offset + BATCH_SIZE);

      // Skip chunks already embedded by a previous run.
      const existing = await db
        .select({
          chunkId: knowledgeEmbeddings.chunkId,
        })
        .from(knowledgeEmbeddings)
        .where(
          and(
            eq(
              knowledgeEmbeddings.organizationId,
              organizationId,
            ),
            eq(knowledgeEmbeddings.provider, configuration.provider),
            eq(knowledgeEmbeddings.modelId, configuration.modelId),
            inArray(
              knowledgeEmbeddings.chunkId,
              batch.map((chunk) => chunk.id),
            ),
          ),
        );

      const existingIds = new Set(
        existing.map((item) => item.chunkId),
      );

      const missing = batch.filter(
        (chunk) => !existingIds.has(chunk.id),
      );

      if (missing.length === 0) continue;

      const vectors = await this.embed(
        missing.map((chunk) => chunk.content),
        configuration,
      );

      // A chunk may have been deleted by re-ingestion
      // while the external embedding request ran.
      // Recheck document/chunk identity in transaction.
      const inserted = await db.transaction(async (tx) => {
        const [currentDocument] = await tx
          .select({ id: knowledgeDocuments.id })
          .from(knowledgeDocuments)
          .where(
            and(
              eq(knowledgeDocuments.id, documentId),
              eq(
                knowledgeDocuments.organizationId,
                organizationId,
              ),
          eq(knowledgeDocuments.status, "ready"),
          eq(knowledgeDocuments.sourceGeneration, sourceGeneration),
          eq(knowledgeDocuments.embeddingStatus, "processing"),
          eq(knowledgeDocuments.embeddingToken, token),
            ),
          )
          .for("update")
          .limit(1);

        if (!currentDocument) {
          throw new Error(
            "Document changed during embedding",
          );
        }

        const validChunks = await tx
          .select({ id: knowledgeChunks.id })
          .from(knowledgeChunks)
          .where(
            and(
              eq(knowledgeChunks.documentId, documentId),
              eq(
                knowledgeChunks.organizationId,
                organizationId,
              ),
            ),
          );

        const validIds = new Set(
          validChunks.map((item) => item.id),
        );

        const values = missing.flatMap(
          (chunk, index) =>
            validIds.has(chunk.id)
              ? [{
                  id: randomUUID(),
                  organizationId,
                  chunkId: chunk.id,
                  provider: configuration.provider,
                  modelId: configuration.modelId,
                  dimensions: configuration.dimensions,
                  embedding: vectors[index]!,
                }]
              : [],
        );

        if (values.length > 0) {
          const rows = await tx
            .insert(knowledgeEmbeddings)
            .values(values)
            .onConflictDoNothing()
            .returning({ id: knowledgeEmbeddings.id });

          return rows.length;
        }

        return 0;
      });

      embedded += inserted;
    }

    this.logger.log(
      JSON.stringify({
        event: "knowledge.embedding.completed",
        organizationId,
        documentId,
        modelId: configuration.modelId,
        generated: embedded,
        totalChunks: chunks.length,
      }),
    );

    await db.update(knowledgeDocuments).set({
      embeddingStatus: "completed",
      embeddingCompletedAt: new Date(),
      embeddingErrorMessage: null,
      embeddingToken: null,
      updatedAt: new Date(),
    }).where(and(
      eq(knowledgeDocuments.id, documentId),
      eq(knowledgeDocuments.organizationId, organizationId),
      eq(knowledgeDocuments.sourceGeneration, sourceGeneration),
      eq(knowledgeDocuments.embeddingStatus, "processing"),
      eq(knowledgeDocuments.embeddingToken, token),
    ));

    return {
      success: true,
      organizationId,
      documentId,
      modelId: configuration.modelId,
      totalChunks: chunks.length,
      generated: embedded,
    };
  }

  async embedQuery(
    organizationId: string,
    query: string,
    timeoutMs = 3_500,
  ) {
    const configuration = await this.configuration(organizationId);
    const [embedding] = await this.embed(
      [query],
      configuration,
      timeoutMs,
    );

    if (!embedding) {
      throw new Error("Embedding provider returned no query vector");
    }

    return {
      embedding,
      provider: configuration.provider,
      modelId: configuration.modelId,
    };
  }
}
