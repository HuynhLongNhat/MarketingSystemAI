import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

// Load DATABASE_URL từ .env.local ở root monorepo.
// Không in hoặc ghi giá trị DATABASE_URL ra log.
config({
  path: resolve(process.cwd(), "../../.env.local"),
});

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Fallback chỉ trỏ về localhost, không phải production.
    // db:migrate sẽ cần PostgreSQL local đang hoạt động.
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/marketing_system_ai_local",
  },
});