
import {
  BadRequestException,
  Controller,
  Post,
  UseGuards,
} from "@nestjs/common";

import { ApiTags } from "@nestjs/swagger";
import { and, asc, eq } from "drizzle-orm";

import {
  db,
  knowledgeDocuments,
} from "@workspace/db/node";

import {
  AuthGuard,
} from "../auth/auth.guard.js";

import {
  CurrentContext,
} from "../auth/current-context.decorator.js";

import type {
  RequestContext,
} from "../auth/request-context.js";

import {
  PermissionsGuard,
} from "../common/permissions/permissions.guard.js";

import {
  RequirePermissions,
} from "../common/permissions/permissions.decorator.js";

import {
  PERMISSIONS,
} from "../common/permissions/permissions.js";

import {
  JobsService,
} from "../jobs/jobs.service.js";

import {
  EmbeddingConfigurationError,
  KnowledgeEmbeddingService,
} from "./knowledge-embedding.service.js";

const MAX_BACKFILL_DOCUMENTS = 100;

@ApiTags("Knowledge Embeddings")
@Controller("knowledge-connections/embeddings")
@UseGuards(AuthGuard, PermissionsGuard)
export class KnowledgeEmbeddingController {
  constructor(
    private readonly jobs: JobsService,
    private readonly embeddings: KnowledgeEmbeddingService,
  ) {}

  @Post("backfill")
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_UPDATE)
  async backfill(
    @CurrentContext() ctx: RequestContext,
  ) {
    try {
      await this.embeddings.assertConfiguration(ctx.organizationId);
    } catch (error) {
      if (error instanceof EmbeddingConfigurationError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }

    const documents = await db
      .select({
        id: knowledgeDocuments.id,
      })
      .from(knowledgeDocuments)
      .where(
        and(
          eq(
            knowledgeDocuments.organizationId,
            ctx.organizationId,
          ),
          eq(knowledgeDocuments.status, "ready"),
        ),
      )
      .orderBy(asc(knowledgeDocuments.createdAt))
      .limit(MAX_BACKFILL_DOCUMENTS);

    const queued = [];

    for (const document of documents) {
      const prepared = await this.embeddings.prepareJob({
        organizationId: ctx.organizationId,
        documentId: document.id,
      });

      if (!prepared || prepared.alreadyQueued) continue;

      let result;
      try {
        result = await this.jobs.enqueueKnowledgeEmbedding({
          organizationId: ctx.organizationId,
          documentId: document.id,
          sourceGeneration: prepared.sourceGeneration,
          token: prepared.token,
        });
      } catch {
        await this.embeddings.markQueueFailed({
          organizationId: ctx.organizationId,
          documentId: document.id,
          sourceGeneration: prepared.sourceGeneration,
          token: prepared.token,
        });
        continue;
      }

      queued.push({
        documentId: document.id,
        jobId: result.jobId,
      });
    }

    return {
      success: true,
      queuedCount: queued.length,
      queued,
      limit: MAX_BACKFILL_DOCUMENTS,
      message:
        documents.length === MAX_BACKFILL_DOCUMENTS
          ? "Embedding jobs queued. Run backfill again for remaining documents."
          : "Embedding jobs queued",
    };
  }
}
