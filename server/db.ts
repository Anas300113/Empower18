/**
 * @deprecated Use `server/db/index.ts` directly.
 *
 * This module previously contained the MySQL implementation. It now re-exports
 * the PostgreSQL runtime so existing imports keep working. New code must import
 * from `server/db/index`.
 */
export { getDb, getSql, getMigrationSql, closeDb } from "./db/index";
