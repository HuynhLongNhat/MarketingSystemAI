import { config } from "dotenv";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

import {
  verifyDatabaseEnvironment,
  type DatabaseEnvironment,
} from "./environment-guard.js";

// Load .env.local trước khi kiểm tra APP_ENV.
// Không ghi đè biến môi trường đã được thiết lập sẵn.
config({
  path: resolve(process.cwd(), "../../.env.local"),
});

const environment = process.env.APP_ENV;

if (
  environment !== "development" &&
  environment !== "staging" &&
  environment !== "production"
) {
  throw new Error("Valid APP_ENV is required for migration");
}

// 2. Load development environment variables
if (environment === "development") {
  config({
    path: resolve(process.cwd(), "../../.env.local"),
  });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// 3. Verify database environment before migration
const pool = new Pool({
  connectionString: databaseUrl,
});

try {
  for (const extension of ["vector", "unaccent"]) {
    try {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS ${extension}`);
    } catch {
      throw new Error(
        `PostgreSQL extension \"${extension}\" is required. Ask the database administrator to enable it before running migrations.`,
      );
    }
  }

  await verifyDatabaseEnvironment(pool, environment as DatabaseEnvironment);
} finally {
  await pool.end();
}

console.log(`Migration preflight passed (${environment})`);

// 4. Resolve Drizzle CLI directly
const currentDirectory = dirname(fileURLToPath(import.meta.url));

const drizzleCli = resolve(
  currentDirectory,
  "../node_modules/drizzle-kit/bin.cjs",
);

// 5. Execute Drizzle migration
const result = spawnSync(
  process.execPath,
  [drizzleCli, "migrate", "--config=drizzle.config.ts"],
  {
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      APP_ENV: environment,
      DATABASE_URL: databaseUrl,
    },
  },
);

// 6. Handle migration errors
if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
}
