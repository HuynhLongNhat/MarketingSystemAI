
import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { randomUUID } from "node:crypto";

import type { RequestContext } from "../auth/request-context.js";
import { createTenantJobData } from "./tenant-job.js";
import { DEFAULT_QUEUE, JOB_NAMES } from "./jobs.constants.js";

export interface CustomerSupportReplyJobData {
  organizationId: string;
  conversationId: string;
  triggerMessageId: string;
  createdAt: string;
}

export interface KnowledgeIngestionJobData {
  organizationId: string;
  sourceId: string;
  createdAt: string;
}

export interface KnowledgeEmbeddingJobData {
  organizationId: string;
  documentId: string;
  createdAt: string;
}

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(DEFAULT_QUEUE)
    private readonly queue: Queue,
  ) {}

  async enqueueHealthCheck(message: string) {
    const job = await this.queue.add(
      JOB_NAMES.HEALTH_CHECK,
      {
        message,
        createdAt: new Date().toISOString(),
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );

    return {
      jobId: job.id,
      jobName: job.name,
    };
  }

  async enqueueTenantTask(
    context: RequestContext,
    message: string,
  ) {
    const data = createTenantJobData(context, {
      message,
    });

    const job = await this.queue.add(
      JOB_NAMES.TENANT_TASK,
      data,
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );

    return {
      jobId: job.id,
      jobName: job.name,
      organizationId: context.organizationId,
    };
  }

  async enqueueCustomerSupportReply(input: {
    organizationId: string;
    conversationId: string;
    triggerMessageId: string;
  }) {
    const {
      organizationId,
      conversationId,
      triggerMessageId,
    } = input;

    if (
      !organizationId ||
      !conversationId ||
      !triggerMessageId
    ) {
      throw new Error(
        "Invalid customer support reply job identity",
      );
    }

    const jobId =
      `widget-ai-${organizationId}-${conversationId}-${triggerMessageId}`;

    const data: CustomerSupportReplyJobData = {
      organizationId,
      conversationId,
      triggerMessageId,
      createdAt: new Date().toISOString(),
    };

    const job = await this.queue.add(
      JOB_NAMES.CUSTOMER_SUPPORT_REPLY,
      data,
      {
        jobId,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 604800,
          count: 1000,
        },
      },
    );

    return {
      jobId: job.id,
      jobName: job.name,
      organizationId,
      conversationId,
      triggerMessageId,
    };
  }

  async enqueueKnowledgeSource(input: {
    organizationId: string;
    sourceId: string;
  }) {
    const { organizationId, sourceId } = input;

    if (!organizationId || !sourceId) {
      throw new Error(
        "Invalid knowledge ingestion identity",
      );
    }

    const data: KnowledgeIngestionJobData = {
      organizationId,
      sourceId,
      createdAt: new Date().toISOString(),
    };

    const job = await this.queue.add(
      JOB_NAMES.KNOWLEDGE_INGEST_SOURCE,
      data,
      {
        jobId: `knowledge-${sourceId}-${randomUUID()}`,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 604800,
          count: 1000,
        },
      },
    );

    return {
      jobId: job.id,
      jobName: job.name,
      organizationId,
      sourceId,
    };
  }

  async enqueueKnowledgeEmbedding(input: {
    organizationId: string;
    documentId: string;
  }) {
    const { organizationId, documentId } = input;

    if (!organizationId || !documentId) {
      throw new Error(
        "Invalid knowledge embedding identity",
      );
    }

    const data: KnowledgeEmbeddingJobData = {
      organizationId,
      documentId,
      createdAt: new Date().toISOString(),
    };

    const job = await this.queue.add(
      JOB_NAMES.KNOWLEDGE_EMBED_DOCUMENT,
      data,
      {
        jobId: `knowledge-embedding-${documentId}-${randomUUID()}`,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 604800,
          count: 1000,
        },
      },
    );

    return {
      jobId: job.id,
      jobName: job.name,
      organizationId,
      documentId,
    };
  }
}
