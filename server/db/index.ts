import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// ─────────────────────────────────────────────────────────────────────────────
// Connection configuration
//
// Two distinct connection strings are supported:
//   DATABASE_URL          — runtime connection (Supabase session pooler, port 6543)
//   MIGRATION_DATABASE_URL— direct connection for migrations (port 5432)
//
// The runtime pool is sized for the Express server. Migrations use a separate
// client so a long-running migration never starves request traffic.
// ─────────────────────────────────────────────────────────────────────────────

const RUNTIME_URL = process.env.DATABASE_URL ?? "";
const MIGRATION_URL =
  process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL ?? "";

const POOL_MAX = Number(
  process.env.DATABASE_POOL_MAX ?? (process.env.VERCEL ? "1" : "10")
);
const IDLE_TIMEOUT = Number(process.env.DATABASE_IDLE_TIMEOUT ?? "20");
const CONNECT_TIMEOUT = Number(process.env.DATABASE_CONNECT_TIMEOUT ?? "10");

function makePool(url: string) {
  return postgres(url, {
    max: POOL_MAX,
    idle_timeout: IDLE_TIMEOUT,
    connect_timeout: CONNECT_TIMEOUT,
  });
}

let _runtimeSql: ReturnType<typeof postgres> | null = null;
let _migrationSql: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Lazily create the runtime drizzle instance + postgres pool.
 * Returns null when no DATABASE_URL is configured so local tooling
 * (builds, type-checks, tests) can run without a live database.
 */
export async function getDb() {
  if (!_db && RUNTIME_URL) {
    try {
      _runtimeSql = makePool(RUNTIME_URL);
      _db = drizzle(_runtimeSql);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Runtime postgres-js client (connection pool). Use for application queries.
 */
export async function getSql() {
  if (!_runtimeSql && RUNTIME_URL) {
    try {
      _runtimeSql = makePool(RUNTIME_URL);
      if (!_db) _db = drizzle(_runtimeSql);
    } catch (error) {
      console.warn("[Database] Failed to create runtime sql client:", error);
      _runtimeSql = null;
    }
  }
  return _runtimeSql;
}

/**
 * Migration postgres-js client (direct connection, separate pool).
 * Use ONLY for running schema migrations — never for request traffic.
 */
export async function getMigrationSql() {
  if (!_migrationSql && MIGRATION_URL) {
    try {
      _migrationSql = makePool(MIGRATION_URL);
    } catch (error) {
      console.warn("[Database] Failed to create migration sql client:", error);
      _migrationSql = null;
    }
  }
  return _migrationSql;
}

/**
 * Gracefully shut down all pools. Call on process shutdown (SIGINT/SIGTERM).
 */
export async function closeDb() {
  const closing: Promise<unknown>[] = [];

  if (_runtimeSql) {
    closing.push(
      _runtimeSql.end({ timeout: 5 }).catch(error => {
        console.warn("[Database] Error closing runtime pool:", error);
      })
    );
  }
  if (_migrationSql) {
    closing.push(
      _migrationSql.end({ timeout: 5 }).catch(error => {
        console.warn("[Database] Error closing migration pool:", error);
      })
    );
  }

  await Promise.allSettled(closing);
  _runtimeSql = null;
  _migrationSql = null;
  _db = null;
}

// TODO: add feature queries here as your schema grows.
