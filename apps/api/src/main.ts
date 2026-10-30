import "reflect-metadata";
import "./env.js";
import { environment, validateServerEnvironment } from "./env.js";

validateServerEnvironment();
import { pool, verifyDatabaseEnvironment } from "@workspace/db/node";
import { randomUUID } from "node:crypto";
import { NestFactory } from "@nestjs/core";
import { BadRequestException, Logger, ValidationPipe } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { toNodeHandler } from "better-auth/node";
import type { Request, Response, NextFunction } from "express";

import { AppModule } from "./app.module.js";
import { auth } from "./auth.js";
import { AllExceptionsFilter } from "./common/all-exceptions.filter.js";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor.js";

async function bootstrap(): Promise<void> {
  await verifyDatabaseEnvironment(pool, environment);
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(["log", "error", "warn", "debug"]);

  app.enableShutdownHooks();

  app.setGlobalPrefix("v1");

  app.enableCors({
    origin: (
      process.env.WEB_URL ?? "http://localhost:3000,http://localhost:3001"
    )
      .split(",")
      .map((origin) => origin.trim()),
    credentials: true,
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const incomingId = req.headers["x-request-id"];

    const requestId =
      typeof incomingId === "string" &&
      incomingId.length > 0 &&
      incomingId.length <= 128
        ? incomingId
        : randomUUID();

    res.setHeader("x-request-id", requestId);
    next();
  });

  // Better Auth giữ endpoint riêng ngoài /v1.
  app.use("/api/auth", toNodeHandler(auth));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      stopAtFirstError: false,
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = errors.flatMap((error) =>
          Object.values(error.constraints ?? {}),
        );

        return new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: messages,
        });
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  if (
    environment === "development" ||
    (!process.env.APP_ENV && process.env.NODE_ENV !== "production")
  ) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("CompanyMarketingSystem API")
      .setDescription(
        "REST API for the CompanyMarketingSystem marketing automation platform.",
      )
      .setVersion("1.0.0")
      .addTag("Health", "API and database health checks")
      .addTag("Widget Settings", "Widget configuration management")
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup("docs", app, document, {
      jsonDocumentUrl: "/docs/openapi.json",
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = Number(process.env.PORT ?? 3002);

  await app.listen(port);

  logger.log(`API: http://localhost:${port}/v1`);
  logger.log(`Auth: http://localhost:${port}/api/auth`);

  if (
    environment === "development" ||
    (!process.env.APP_ENV && process.env.NODE_ENV !== "production")
  ) {
    logger.log(`Swagger: http://localhost:${port}/docs`);
  }
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start API:", error);
  process.exitCode = 1;
});
