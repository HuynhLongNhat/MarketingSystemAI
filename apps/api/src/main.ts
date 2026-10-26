
import 'reflect-metadata';
import './env.js';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  console.log('[BOOT] Before NestFactory.create');

  const app = await NestFactory.create(AppModule);

  console.log('[BOOT] NestFactory.create completed');

  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();

  console.log('[BOOT] Before app.listen');

  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port);

  console.log('[BOOT] app.listen completed');
  console.log(`NestJS API: http://localhost:${port}/v1`);
}
