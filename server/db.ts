/**
 * @deprecated Use `server/db/index.ts` directly.
 *
 * This module previously contained the MySQL implementation. It now re-exports
 * the PostgreSQL runtime so existing imports keep working during the
 * authentication transition. New code must import from `server/db/index`.
 */
export {
  getDb,
  getSql,
  getMigrationSql,
  closeDb,
  upsertUser,
  getUserByOpenId,
} from "./db/index";

export type { User, InsertUser } from "../drizzle/schema";
