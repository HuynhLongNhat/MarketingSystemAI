
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
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case JOB_NAMES.HEALTH_CHECK:
        return this.handleHealthCheck(job);

      case JOB_NAMES.TENANT_TASK:
        return this.handleTenantTask(job);

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

    const data = job.data as TenantJobData<TenantTaskPayload>;

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

    // Logic nghiệp vụ sẽ được triển khai
    // khi có tác vụ AI Agent thực tế.

    return {
      success: true,
      organizationId: data.organizationId,
      processedAt: new Date().toISOString(),
    };
  }
}
