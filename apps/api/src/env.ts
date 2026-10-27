
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type AppEnvironment =
  | 'development'
  | 'staging'
  | 'production';

const appEnv = (
  process.env.APP_ENV ??
  process.env.NODE_ENV ??
  'development'
) as string;

const supportedEnvironments = [
  'development',
  'staging',
  'production',
];

if (!supportedEnvironments.includes(appEnv)) {
  throw new Error(
    `Invalid APP_ENV: ${appEnv}`,
  );
}

export const environment = appEnv as AppEnvironment;

if (environment === 'development') {
  const currentDirectory = dirname(
    fileURLToPath(import.meta.url),
  );

  const rootEnvPath = resolve(
    currentDirectory,
    '../../../.env.local',
  );

  config({
    path: rootEnvPath,
  });
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
}

export function validateServerEnvironment(): void {
  requireEnv('DATABASE_URL');
  requireEnv('BETTER_AUTH_URL');

  const secret = requireEnv('BETTER_AUTH_SECRET');

  if (secret.length < 32) {
    throw new Error(
      'BETTER_AUTH_SECRET must contain at least 32 characters',
    );
  }

  if (environment !== 'development') {
    requireEnv('WEB_URL');
    requireEnv('REDIS_HOST');
    requireEnv('REDIS_PORT');
  }

  const port = Number(process.env.PORT ?? 3002);

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error('Invalid PORT');
  }
}
