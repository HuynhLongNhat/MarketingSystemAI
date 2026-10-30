
import { config } from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

config({ path: "../../.env.local" });

if (process.env.APP_ENV !== "development") {
  throw new Error("Only development is allowed");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  query_timeout: 15000,
  statement_timeout: 15000,
});

try {
  const db = drizzle(pool);

  console.log("Starting migration...");

  await migrate(db, {
    migrationsFolder: "./drizzle",
  });

  console.log("Migration PASS");
} catch (error) {
  console.error("MIGRATION ERROR:", error);
  console.error("CAUSE:", error?.cause);
  process.exitCode = 1;
} finally {
  await pool.end();
}
