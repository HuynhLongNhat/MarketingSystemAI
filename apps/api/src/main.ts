
import 'reflect-metadata';
import './env.js';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port);

  console.log(`NestJS API is running at http://localhost:${port}/api`);
}

void bootstrap();
