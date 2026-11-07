
import { Module } from "@nestjs/common";

import {
  ConversationsModule,
} from "../conversations/conversations.module.js";

import {
  KnowledgeConnectionsModule,
} from "../knowledge-connections/knowledge-connections.module.js";

import {
  JobsModule,
} from "./jobs.module.js";

import {
  JobsProcessor,
} from "./jobs.processor.js";

import {
  TenantJobAuthorization,
} from "./tenant-job-authorization.js";

@Module({
  imports: [
    JobsModule,
    ConversationsModule,
    KnowledgeConnectionsModule,
  ],

  providers: [
    JobsProcessor,
    TenantJobAuthorization,
  ],
})
export class JobsWorkerModule {}
