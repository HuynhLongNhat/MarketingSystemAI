
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { JobsWorkerModule } from './jobs/jobs.module.js';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? 6379),
        maxRetriesPerRequest: null,
      },
    }),
    JobsWorkerModule,
  ],
})
export class WorkerModule {}
