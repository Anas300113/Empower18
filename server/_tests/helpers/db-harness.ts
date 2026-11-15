/**
 * QA-owned disposable PostgreSQL harness.
 *
 * A live database is ONLY used when TEST_DATABASE_URL points at a throwaway
 * instance (e.g. `postgresql://user:pass@host:5432/postgres`). When unset the
 * DB tests self-skip so the suite stays green in CI without infra.
 *
 * NEVER point this at production. The harness creates and drops its own
 * database named `empower18_qa_<random>`.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

export const MIGRATION_FILES = [
  "0000_petite_luckman.sql",
  "0001_enable_rls.sql",
  "0002_high_miss_america.sql",
  "0003_mixed_blizzard.sql",
  "0004_allow_audit_actor_removal.sql",
  "0005_prevent_duplicate_student_applications.sql",
].map(file =>
  path.resolve(import.meta.dirname, "../../../drizzle/migrations", file)
);

export type DisposableDb = {
  sql: postgres.Sql;
  databaseUrl: string;
  drop: () => Promise<void>;
};

export function getTestDatabaseUrl(): string {
  return process.env.TEST_DATABASE_URL ?? "";
}

/** Create a fresh database and return a connected client + drop function. */
export async function createDisposableDatabase(): Promise<DisposableDb> {
  const url = getTestDatabaseUrl();
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set");
  }

  const admin = postgres(url, { max: 1, connect_timeout: 5 });
  const databaseName = `empower18_qa_${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  try {
    await admin.unsafe(`CREATE DATABASE ${databaseName}`);
  } finally {
    await admin.end();
  }

  const databaseUrl = url.replace(/\/[^/]+$/, `/${databaseName}`);
  const sql = postgres(databaseUrl, { max: 5, connect_timeout: 10 });

  return {
    sql,
    databaseUrl,
    drop: async () => {
      try {
        await sql.end({ timeout: 5 });
      } catch {
        /* ignore */
      }
      const killer = postgres(url, { max: 1, connect_timeout: 5 });
      try {
        await killer.unsafe(
          `DROP DATABASE IF EXISTS ${databaseName} WITH (FORCE)`
        );
      } finally {
        await killer.end();
      }
    },
  };
}

/**
 * Apply the migration SQL file. postgres.js `unsafe` supports multi-statement
 * strings; if that ever regresses we fall back to statement-by-statement.
 */
export async function applyMigrationFile(
  sql: postgres.Sql,
  file = MIGRATION_FILES[0]
): Promise<void> {
  const content = await readFile(file, "utf8");
  try {
    await sql.unsafe(content);
    return;
  } catch {
    // Fallback: split on statement terminators that sit at line ends.
  }

  const statements = content
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));
  for (const statement of statements) {
    await sql.unsafe(statement);
  }
}

export async function applyAllMigrations(sql: postgres.Sql): Promise<void> {
  for (const file of MIGRATION_FILES) {
    await applyMigrationFile(sql, file);
  }
}
