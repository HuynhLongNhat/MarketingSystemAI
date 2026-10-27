
import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

const environment =
  process.env.APP_ENV ??
  process.env.NODE_ENV ??
  "development";

if (environment === "development") {
  config({
    path: resolve(process.cwd(), "../../.env.local"),
  });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required to run Drizzle commands.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
