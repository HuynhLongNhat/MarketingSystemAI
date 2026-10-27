
import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import {
  DEFAULT_QUEUE,
  JOB_NAMES,
} from './jobs.constants.js';

@Processor(DEFAULT_QUEUE)
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(
    JobsProcessor.name,
  );

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case JOB_NAMES.HEALTH_CHECK:
        return this.handleHealthCheck(job);

      default:
        throw new Error(
          `Unsupported job type: ${job.name}`,
        );
    }
  }

  private async handleHealthCheck(job: Job) {
    const message = String(
      job.data?.message ?? '',
    );

    this.logger.log(
      JSON.stringify({
        event: 'job.processing',
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
}
