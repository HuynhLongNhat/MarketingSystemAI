
import 'reflect-metadata';
import './env.js';

import { NestFactory } from '@nestjs/core';
import { toNodeHandler } from 'better-auth/node';

import { AppModule } from './app.module.js';
import { auth } from './auth.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();

  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // Better Auth handles its own /api/auth/* routes.
  app.use('/api/auth', toNodeHandler(auth));

  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port);

  console.log(`NestJS API: http://localhost:${port}/v1`);
  console.log(`Better Auth: http://localhost:${port}/api/auth`);
}

bootstrap().catch((error: unknown) => {
  console.error('[BOOT] Failed to start NestJS API:', error);
  process.exitCode = 1;
});
