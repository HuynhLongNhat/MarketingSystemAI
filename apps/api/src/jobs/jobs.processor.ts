
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

import { TenantJobAuthorization } from "./tenant-job-authorization.js";

interface TenantTaskData {
  organizationId: string;
  requestedBy: string;
  createdAt: string;
  payload: {
    message: string;
  };
}

function parseTenantTaskData(
  value: unknown,
): TenantTaskData {
  if (!value || typeof value !== "object") {
    throw new UnrecoverableError(
      "Invalid tenant job data",
    );
  }

  const data = value as Record<string, unknown>;
  const payload = data.payload;

  if (
    typeof data.organizationId !== "string" ||
    !data.organizationId ||
    typeof data.requestedBy !== "string" ||
    !data.requestedBy ||
    typeof data.createdAt !== "string" ||
    !payload ||
    typeof payload !== "object" ||
    typeof (payload as Record<string, unknown>).message !== "string"
  ) {
    throw new UnrecoverableError(
      "Invalid tenant job data",
    );
  }

  return data as unknown as TenantTaskData;
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

      case "tenant.task":
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
    const data = parseTenantTaskData(job.data);

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

    // Chỉ chạy logic nghiệp vụ sau khi authorize.
    // Chưa có truy vấn dữ liệu tenant ở job mẫu này.

    return {
      success: true,
      organizationId: data.organizationId,
      processedAt: new Date().toISOString(),
    };
  }
}
