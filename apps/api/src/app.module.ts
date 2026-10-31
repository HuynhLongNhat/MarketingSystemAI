
import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";

import { HealthController } from "./health.controller.js";
import { DatabaseModule } from "./database/database.module.js";
import { WidgetSettingsModule } from "./widget-settings/widget-settings.module.js";
import { JobsModule } from "./jobs/jobs.module.js";
import { OrganizationsModule } from "./organizations/organizations.module.js";
import { ConversationsModule } from "./conversations/conversations.module.js";
import { KnowledgeModule } from "./knowledge/knowledge.module.js";
import { AiProvidersModule } from "./ai-providers/ai-providers.module.js";

@Module({
  imports: [
    DatabaseModule,
    WidgetSettingsModule,

    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? "127.0.0.1",
        port: Number(process.env.REDIS_PORT ?? 6379),
        maxRetriesPerRequest: null,
      },
    }),

    JobsModule,
    OrganizationsModule,
    ConversationsModule,
    KnowledgeModule,
    AiProvidersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
