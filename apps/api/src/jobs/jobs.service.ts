import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";

import type { RequestContext } from "../auth/request-context.js";
import { createTenantJobData } from "./tenant-job.js";

import { DEFAULT_QUEUE, JOB_NAMES } from "./jobs.constants.js";

export interface CustomerSupportReplyJobData {
  organizationId: string;
  conversationId: string;
  triggerMessageId: string;
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

  async enqueueTenantTask(context: RequestContext, message: string) {
    const data = createTenantJobData(context, {
      message,
    });

    const job = await this.queue.add(JOB_NAMES.TENANT_TASK, data, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
    });

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

    if (!organizationId || !conversationId || !triggerMessageId) {
      throw new Error("Invalid customer support reply job identity");
    }

    // Stable ID: cùng một tin nhắn khách chỉ có một job đang được lưu.
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
        // Giữ job đã hoàn tất một thời gian để request retry
        // không tạo thêm job mới cho cùng một tin nhắn.
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
}