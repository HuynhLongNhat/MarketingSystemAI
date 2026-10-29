
import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";

import type { RequestContext } from "../auth/request-context.js";
import { createTenantJobData } from "./tenant-job.js";

import {
  DEFAULT_QUEUE,
  JOB_NAMES,
} from "./jobs.constants.js";

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
      "tenant.task",
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
}
