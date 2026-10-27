
import '../env.js';

import { Queue } from 'bullmq';
import {
  DEFAULT_QUEUE,
  JOB_NAMES,
} from './jobs.constants.js';

async function main(): Promise<void> {
  const queue = new Queue(DEFAULT_QUEUE, {
    connection: {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      maxRetriesPerRequest: null,
    },
  });

  try {
    const job = await queue.add(
      JOB_NAMES.HEALTH_CHECK,
      {
        message: 'Hello from MarketingSystemAI',
        createdAt: new Date().toISOString(),
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );

    console.log('Job created:', job.id);
  } finally {
    await queue.close();
  }
}

main().catch((error: unknown) => {
  console.error('Queue test failed:', error);
  process.exitCode = 1;
});
