
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, eq, gte, lt, sql } from "drizzle-orm";

import {
  aiModelDefaults,
  aiProviderConnections,
  aiUsageLogs,
  aiUsageQuotas,
  db,
} from "@workspace/db/node";

import type {
  AiProviderConnection,
  AiProviderType,
} from "@workspace/db/node";

import type { RequestContext } from "../auth/request-context.js";
import { tenantWhere } from "../common/tenant/tenant-query.js";
import { encryptCredential } from "../ai-credentials/credential-crypto.js";
import { decryptCredential } from "../ai-credentials/credential-crypto.js";
import { getEmbeddingModelDimensions } from "./provider-registry.js";

import {
  AI_MODEL_PURPOSES,
  type AiModelPurpose,
  type CreateAiProviderDto,
  type UpdateAiProviderDto,
  type UpsertAiModelDefaultDto,
} from "./ai-providers.dto.js";

function safeConnection(connection: AiProviderConnection) {
  return {
    id: connection.id,
    provider: connection.provider,
    name: connection.name,
    enabled: connection.enabled,
    hasApiKey: true,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  };
}

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const value = error as {
    code?: unknown;
    cause?: unknown;
  };

  if (typeof value.code === "string") {
    return value.code;
  }

  return databaseErrorCode(value.cause);
}

@Injectable()
export class AiProvidersService {
  async connectionUsage(context: RequestContext, id: string) {
    const connection = await this.findConnection(context, id);
    if (connection.provider !== "openrouter") return { status: "unsupported" as const, checkedAt: new Date().toISOString() };
    try {
      if (connection.keyVersion !== "v1") return { status: "unavailable" as const, checkedAt: new Date().toISOString() };
      const apiKey = decryptCredential({ encryptedApiKey: connection.encryptedApiKey, keyIv: connection.keyIv, keyAuthTag: connection.keyAuthTag, keyVersion: "v1" }, { organizationId: context.organizationId, connectionId: connection.id, provider: connection.provider });
      const response = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(5_000) });
      if (!response.ok) return { status: response.status === 401 ? "unauthorized" as const : response.status === 429 ? "rate_limited" as const : "unavailable" as const, checkedAt: new Date().toISOString() };
      const body = await response.json() as { data?: { usage?: number; limit?: number | null; limit_remaining?: number | null; is_free_tier?: boolean; expires_at?: string | null } };
      const data = body.data;
      return { status: "available" as const, usage: data?.usage ?? null, spendingLimit: data?.limit ?? null, remaining: data?.limit_remaining ?? null, freeTier: data?.is_free_tier ?? null, expiresAt: data?.expires_at ?? null, checkedAt: new Date().toISOString() };
    } catch { return { status: "unavailable" as const, checkedAt: new Date().toISOString() }; }
  }
  async organizationUsage(context: RequestContext) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const [[usage], [quota]] = await Promise.all([
      db.select({ tokens: sql<string>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)::text`, requests: sql<string>`count(*)::text` }).from(aiUsageLogs).where(and(eq(aiUsageLogs.organizationId, context.organizationId), gte(aiUsageLogs.createdAt, start), lt(aiUsageLogs.createdAt, next))),
      db.select({ limit: aiUsageQuotas.monthlyTokenLimit }).from(aiUsageQuotas).where(eq(aiUsageQuotas.organizationId, context.organizationId)).limit(1),
    ]);
    const usedTokens = Number(usage?.tokens ?? 0);
    const monthlyTokenLimit = quota?.limit ?? null;
    return { periodStart: start.toISOString(), periodEnd: next.toISOString(), usedTokens, requestCount: Number(usage?.requests ?? 0), monthlyTokenLimit, remainingTokens: monthlyTokenLimit === null ? null : Math.max(0, monthlyTokenLimit - usedTokens), tracking: { embeddings: "not_separately_tracked" } };
  }
  private validatePurpose(purpose: string): AiModelPurpose {
    if (
      !AI_MODEL_PURPOSES.includes(
        purpose as AiModelPurpose,
      )
    ) {
      throw new BadRequestException(
        "Unsupported AI model purpose",
      );
    }

    return purpose as AiModelPurpose;
  }

  private async findConnection(
    context: RequestContext,
    id: string,
  ): Promise<AiProviderConnection> {
    const [connection] = await db
      .select()
      .from(aiProviderConnections)
      .where(
        tenantWhere(
          context,
          aiProviderConnections.organizationId,
          eq(aiProviderConnections.id, id),
        ),
      )
      .limit(1);

    if (!connection) {
      throw new NotFoundException(
        "AI provider connection not found",
      );
    }

    return connection;
  }

  async listConnections(context: RequestContext) {
    const connections = await db
      .select()
      .from(aiProviderConnections)
      .where(
        tenantWhere(
          context,
          aiProviderConnections.organizationId,
        ),
      );

    return connections.map(safeConnection);
  }

  async getConnection(
    context: RequestContext,
    id: string,
  ) {
    const connection = await this.findConnection(
      context,
      id,
    );

    return safeConnection(connection);
  }

  async createConnection(
    context: RequestContext,
    dto: CreateAiProviderDto,
  ) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException(
        "Connection name cannot be empty",
      );
    }

    if (!dto.apiKey.trim()) {
      throw new BadRequestException(
        "API key cannot be empty",
      );
    }

    const id = randomUUID();

    const encrypted = encryptCredential(
      dto.apiKey,
      {
        organizationId: context.organizationId,
        connectionId: id,
        provider: dto.provider,
      },
    );

    try {
      const [connection] = await db
        .insert(aiProviderConnections)
        .values({
          id,
          organizationId: context.organizationId,
          provider: dto.provider,
          name,
          ...encrypted,
          enabled: true,
        })
        .returning();

      if (!connection) {
        throw new Error("Connection insert failed");
      }

      return safeConnection(connection);
    } catch (error) {
      if (databaseErrorCode(error) === "23505") {
        throw new ConflictException(
          "Connection name already exists for this provider",
        );
      }

      throw error;
    }
  }

  async updateConnection(
    context: RequestContext,
    id: string,
    dto: UpdateAiProviderDto,
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        "At least one update field is required",
      );
    }

    const connection = await this.findConnection(
      context,
      id,
    );

    const updates: Partial<
      typeof aiProviderConnections.$inferInsert
    > = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      if (!name) {
        throw new BadRequestException(
          "Connection name cannot be empty",
        );
      }

      updates.name = name;
    }

    if (dto.enabled !== undefined) {
      updates.enabled = dto.enabled;
    }

    if (dto.apiKey !== undefined) {
      if (!dto.apiKey.trim()) {
        throw new BadRequestException(
          "API key cannot be empty",
        );
      }

      const encrypted = encryptCredential(
        dto.apiKey,
        {
          organizationId: context.organizationId,
          connectionId: connection.id,
          provider: connection.provider,
        },
      );

      Object.assign(updates, encrypted);
    }

    try {
      const [updated] = await db
        .update(aiProviderConnections)
        .set(updates)
        .where(
          tenantWhere(
            context,
            aiProviderConnections.organizationId,
            eq(aiProviderConnections.id, id),
          ),
        )
        .returning();

      if (!updated) {
        throw new NotFoundException(
          "AI provider connection not found",
        );
      }

      return safeConnection(updated);
    } catch (error) {
      if (databaseErrorCode(error) === "23505") {
        throw new ConflictException(
          "Connection name already exists for this provider",
        );
      }

      throw error;
    }
  }

  async deleteConnection(
    context: RequestContext,
    id: string,
  ) {
    await this.findConnection(context, id);

    const [reference] = await db
      .select({ id: aiModelDefaults.id })
      .from(aiModelDefaults)
      .where(
        tenantWhere(
          context,
          aiModelDefaults.organizationId,
          eq(aiModelDefaults.connectionId, id),
        ),
      )
      .limit(1);

    if (reference) {
      throw new ConflictException(
        "Connection is used by a model default. Remove or reassign it first.",
      );
    }

    try {
      const deleted = await db
        .delete(aiProviderConnections)
        .where(
          tenantWhere(
            context,
            aiProviderConnections.organizationId,
            eq(aiProviderConnections.id, id),
          ),
        )
        .returning({ id: aiProviderConnections.id });

      if (deleted.length === 0) {
        throw new NotFoundException(
          "AI provider connection not found",
        );
      }

      return { deleted: true };
    } catch (error) {
      if (databaseErrorCode(error) === "23503") {
        throw new ConflictException(
          "Connection is referenced by a model default",
        );
      }

      throw error;
    }
  }

  async listModelDefaults(context: RequestContext) {
    return db
      .select({
        id: aiModelDefaults.id,
        purpose: aiModelDefaults.purpose,
        connectionId: aiModelDefaults.connectionId,
        modelId: aiModelDefaults.modelId,
        createdAt: aiModelDefaults.createdAt,
        updatedAt: aiModelDefaults.updatedAt,
      })
      .from(aiModelDefaults)
      .where(
        tenantWhere(
          context,
          aiModelDefaults.organizationId,
        ),
      );
  }

  async upsertModelDefault(
    context: RequestContext,
    purposeInput: string,
    dto: UpsertAiModelDefaultDto,
  ) {
    const purpose = this.validatePurpose(purposeInput);
    const modelId = dto.modelId.trim();

    if (!modelId) {
      throw new BadRequestException(
        "Model ID cannot be empty",
      );
    }

    const connection = await this.findConnection(
      context,
      dto.connectionId,
    );

    if (!connection.enabled) {
      throw new BadRequestException(
        "Cannot assign a disabled connection",
      );
    }

    if (
      purpose === "embedding" &&
      getEmbeddingModelDimensions(connection.provider, modelId) !== 1536
    ) {
      throw new BadRequestException(
        "Embedding requires a supported 1536-dimension provider and model",
      );
    }

    const [result] = await db
      .insert(aiModelDefaults)
      .values({
        id: randomUUID(),
        organizationId: context.organizationId,
        purpose,
        connectionId: connection.id,
        modelId,
      })
      .onConflictDoUpdate({
        target: [
          aiModelDefaults.organizationId,
          aiModelDefaults.purpose,
        ],
        set: {
          connectionId: connection.id,
          modelId,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: aiModelDefaults.id,
        purpose: aiModelDefaults.purpose,
        connectionId: aiModelDefaults.connectionId,
        modelId: aiModelDefaults.modelId,
        createdAt: aiModelDefaults.createdAt,
        updatedAt: aiModelDefaults.updatedAt,
      });

    return result;
  }

  async deleteModelDefault(
    context: RequestContext,
    purposeInput: string,
  ) {
    const purpose = this.validatePurpose(purposeInput);

    const deleted = await db
      .delete(aiModelDefaults)
      .where(
        and(
          eq(
            aiModelDefaults.organizationId,
            context.organizationId,
          ),
          eq(aiModelDefaults.purpose, purpose),
        ),
      )
      .returning({ id: aiModelDefaults.id });

    if (deleted.length === 0) {
      throw new NotFoundException(
        "AI model default not found",
      );
    }

    return { deleted: true };
  }
}
