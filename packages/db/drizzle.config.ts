import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

const environment = process.env.APP_ENV;

if (!environment) {
  throw new Error("APP_ENV is required to run Drizzle commands");
}

if (!["development", "staging", "production"].includes(environment)) {
  throw new Error(`Invalid APP_ENV: ${environment}`);
}
if (environment === "development") {
  config({
    path: resolve(process.cwd(), "../../.env.local"),
  });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run Drizzle commands.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
