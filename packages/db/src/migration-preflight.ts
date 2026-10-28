
import { config } from "dotenv";
import { resolve } from "node:path";
import { Pool } from "pg";

import {
  verifyDatabaseEnvironment,
  type DatabaseEnvironment,
} from "./environment-guard.js";

const environment = process.env.APP_ENV;

if (!environment) {
  throw new Error(
    "APP_ENV is required to run database migrations",
  );
}

const allowedEnvironments = [
  "development",
  "staging",
  "production",
];

if (!allowedEnvironments.includes(environment)) {
  throw new Error(`Invalid APP_ENV: ${environment}`);
}

if (environment === "development") {
  config({
    path: resolve(process.cwd(), "../../.env.local"),
  });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

try {
  await verifyDatabaseEnvironment(
    pool,
    environment as DatabaseEnvironment,
  );

  console.log(
    `Migration preflight passed (${environment})`,
  );
} finally {
  await pool.end();
}
