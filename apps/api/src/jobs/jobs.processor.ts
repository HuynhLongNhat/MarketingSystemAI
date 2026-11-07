
import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";

import {
  UnrecoverableError,
  type Job,
} from "bullmq";

import {
  DEFAULT_QUEUE,
  JOB_NAMES,
} from "./jobs.constants.js";

import {
  assertTenantJobData,
  type TenantJobData,
} from "./tenant-job.js";

import { TenantJobAuthorization } from "./tenant-job-authorization.js";

import { PublicWidgetService } from "../conversations/public-widget.service.js";

import type {
  CustomerSupportReplyJobData,
  KnowledgeIngestionJobData,
  KnowledgeEmbeddingJobData,
} from "./jobs.service.js";

import { JobsService } from "./jobs.service.js";

import {
  GoogleDriveIngestionService,
} from "../knowledge-connections/google-drive-ingestion.service.js";

import {
  EmbeddingConfigurationError,
  EmbeddingProviderError,
  KnowledgeEmbeddingService,
} from "../knowledge-connections/knowledge-embedding.service.js";

interface TenantTaskPayload {
  message: string;
}

@Processor(DEFAULT_QUEUE)
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(
    JobsProcessor.name,
  );

  constructor(
    private readonly authorization: TenantJobAuthorization,
    private readonly publicWidgetService: PublicWidgetService,
    private readonly ingestion: GoogleDriveIngestionService,
    private readonly embeddings: KnowledgeEmbeddingService,
    private readonly jobs: JobsService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case JOB_NAMES.HEALTH_CHECK:
        return this.handleHealthCheck(job);

      case JOB_NAMES.TENANT_TASK:
        return this.handleTenantTask(job);

      case JOB_NAMES.CUSTOMER_SUPPORT_REPLY:
        return this.handleCustomerSupportReply(job);

      case JOB_NAMES.KNOWLEDGE_INGEST_SOURCE:
        return this.handleKnowledgeIngestion(job);

      case JOB_NAMES.KNOWLEDGE_EMBED_DOCUMENT:
        return this.handleKnowledgeEmbedding(job);

      default:
        throw new UnrecoverableError(
          `Unsupported job type: ${job.name}`,
        );
    }
  }

  private async handleHealthCheck(job: Job) {
    const message = String(
      job.data?.message ?? "",
    );

    this.logger.log(
      JSON.stringify({
        event: "job.processing",
        jobId: job.id,
        jobName: job.name,
        message,
      }),
    );

    return {
      success: true,
      processedAt: new Date().toISOString(),
    };
  }

  private async handleTenantTask(job: Job) {
    try {
      assertTenantJobData(job.data);
    } catch {
      throw new UnrecoverableError(
        "Invalid tenant job data",
      );
    }

    const data =
      job.data as TenantJobData<TenantTaskPayload>;

    if (
      !data.payload ||
      typeof data.payload !== "object" ||
      typeof data.payload.message !== "string"
    ) {
      throw new UnrecoverableError(
        "Invalid tenant task payload",
      );
    }

    const role = await this.authorization.authorize(
      data.organizationId,
      data.requestedBy,
    );

    this.logger.log(
      JSON.stringify({
        event: "tenant.job.authorized",
        jobId: job.id,
        jobName: job.name,
        organizationId: data.organizationId,
        requestedBy: data.requestedBy,
        role,
      }),
    );

    return {
      success: true,
      organizationId: data.organizationId,
      processedAt: new Date().toISOString(),
    };
  }

  private async handleCustomerSupportReply(
    job: Job,
  ) {
    const data =
      job.data as
        | Partial<CustomerSupportReplyJobData>
        | undefined;

    if (
      !data ||
      typeof data.organizationId !== "string" ||
      !data.organizationId ||
      typeof data.conversationId !== "string" ||
      !data.conversationId ||
      typeof data.triggerMessageId !== "string" ||
      !data.triggerMessageId
    ) {
      throw new UnrecoverableError(
        "Invalid customer support reply job data",
      );
    }

    this.logger.log(
      JSON.stringify({
        event: "customer_support.reply.processing",
        jobId: job.id,
        organizationId: data.organizationId,
        conversationId: data.conversationId,
        triggerMessageId: data.triggerMessageId,
        attempt: job.attemptsMade + 1,
      }),
    );

    await this.publicWidgetService.processAiReply({
      organizationId: data.organizationId,
      conversationId: data.conversationId,
      triggerMessageId: data.triggerMessageId,
    });

    this.logger.log(
      JSON.stringify({
        event: "customer_support.reply.completed",
        jobId: job.id,
        organizationId: data.organizationId,
        conversationId: data.conversationId,
        triggerMessageId: data.triggerMessageId,
      }),
    );

    return {
      success: true,
      organizationId: data.organizationId,
      conversationId: data.conversationId,
      triggerMessageId: data.triggerMessageId,
      processedAt: new Date().toISOString(),
    };
  }

  private async handleKnowledgeIngestion(
    job: Job,
  ) {
    const data =
      job.data as
        | Partial<KnowledgeIngestionJobData>
        | undefined;

    if (
      !data ||
      typeof data.organizationId !== "string" ||
      !data.organizationId ||
      typeof data.sourceId !== "string" ||
      !data.sourceId ||
      !Number.isInteger(data.generation) ||
      typeof data.token !== "string" ||
      !data.token
    ) {
      throw new UnrecoverableError(
        "Invalid knowledge ingestion job data",
      );
    }

    const generation = data.generation as number;
    const token = data.token as string;

    const result = await this.ingestion.process({
      organizationId: data.organizationId,
      sourceId: data.sourceId,
      generation,
      token,
    });

    if (
      "success" in result &&
      result.success === true &&
      "documentId" in result &&
      typeof result.documentId === "string"
    ) {
      const prepared = await this.embeddings.prepareJob({
        organizationId: data.organizationId,
        documentId: result.documentId,
      });

      if (prepared && !prepared.alreadyQueued) {
        try {
          await this.jobs.enqueueKnowledgeEmbedding({
            organizationId: data.organizationId,
            documentId: result.documentId,
            sourceGeneration: prepared.sourceGeneration,
            token: prepared.token,
          });
        } catch {
          await this.embeddings.markQueueFailed({
            organizationId: data.organizationId,
            documentId: result.documentId,
            sourceGeneration: prepared.sourceGeneration,
            token: prepared.token,
          });
          throw new UnrecoverableError("Unable to queue embedding");
        }
      }
    }

    this.logger.log(
      JSON.stringify({
        event: "knowledge.ingestion.finished",
        jobId: job.id,
        organizationId: data.organizationId,
        sourceId: data.sourceId,
        result,
      }),
    );

    return result;
  }

  private async handleKnowledgeEmbedding(
    job: Job,
  ) {
    const data =
      job.data as
        | Partial<KnowledgeEmbeddingJobData>
        | undefined;

    if (
      !data ||
      typeof data.organizationId !== "string" ||
      !data.organizationId ||
      typeof data.documentId !== "string" ||
      !data.documentId ||
      !Number.isInteger(data.sourceGeneration) ||
      typeof data.token !== "string" ||
      !data.token
    ) {
      throw new UnrecoverableError(
        "Invalid knowledge embedding job data",
      );
    }

    const sourceGeneration = data.sourceGeneration as number;
    const token = data.token as string;

    try {
      return await this.embeddings.process({
        organizationId: data.organizationId,
        documentId: data.documentId,
        sourceGeneration,
        token,
      });
    } catch (error) {
      const attempts = job.opts.attempts ?? 1;
      const finalAttempt = job.attemptsMade + 1 >= attempts;
      const safeMessage =
        error instanceof EmbeddingConfigurationError ||
        error instanceof EmbeddingProviderError
          ? error.message
          : "Embedding failed. Retry backfill.";

      if (error instanceof EmbeddingConfigurationError) {
        await this.embeddings.markFailed({
          organizationId: data.organizationId,
          documentId: data.documentId,
          sourceGeneration,
          token,
          message: safeMessage,
        });
        throw new UnrecoverableError(error.message);
      }

      if (
        error instanceof EmbeddingProviderError &&
        !error.retryable
      ) {
        await this.embeddings.markFailed({
          organizationId: data.organizationId,
          documentId: data.documentId,
          sourceGeneration,
          token,
          message: safeMessage,
        });
        throw new UnrecoverableError(error.message);
      }

      if (finalAttempt) {
        await this.embeddings.markFailed({
          organizationId: data.organizationId,
          documentId: data.documentId,
          sourceGeneration,
          token,
          message: safeMessage,
        });
      }

      throw error;
    }
  }
}
