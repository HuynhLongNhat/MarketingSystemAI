import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";

import { DEFAULT_QUEUE } from "./jobs.constants.js";
import { JobsService } from "./jobs.service.js";

@Module({
  imports: [
    BullModule.registerQueue({
      name: DEFAULT_QUEUE,
    }),
  ],
  providers: [JobsService],
  exports: [JobsService, BullModule],
})
export class JobsModule {}