
import type { Pool } from "pg";

export type DatabaseEnvironment =
  | "development"
  | "staging"
  | "production";

export async function verifyDatabaseEnvironment(
  pool: Pool,
  expectedEnvironment: DatabaseEnvironment,
): Promise<void> {
  const result = await pool.query<{
    environment: string;
  }>(
    `
      SELECT environment
      FROM public.environment_identity
      WHERE id = 1
    `,
  );

  if (result.rows.length !== 1) {
    throw new Error(
      "Database environment identity is missing",
    );
  }

  const actualEnvironment = result.rows[0]?.environment;

  if (actualEnvironment !== expectedEnvironment) {
    throw new Error(
      `Database environment mismatch: expected ${expectedEnvironment}, got ${actualEnvironment}`,
    );
  }
}
