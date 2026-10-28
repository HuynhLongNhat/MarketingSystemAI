import "reflect-metadata";
import "./env.js";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { environment, validateServerEnvironment } from "./env.js";
import { WorkerModule } from "./worker.module.js";
import { pool, verifyDatabaseEnvironment } from "@workspace/db/node";
async function bootstrap(): Promise<void> {
  // Validate environment before starting the Worker.
  validateServerEnvironment();

  const logger = new Logger("WorkerBootstrap");
  await verifyDatabaseEnvironment(pool, environment);
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(["log", "error", "warn", "debug"]);
  app.enableShutdownHooks();

  logger.log(`CompanyMarketingSystem Worker started (${environment})`);
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start Worker:", error);
  process.exitCode = 1;
});
