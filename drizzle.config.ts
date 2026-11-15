import { defineConfig } from "drizzle-kit";

const connectionString = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("MIGRATION_DATABASE_URL (or DATABASE_URL) is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
  migrations: {
    // Keep drizzle-kit aligned with drizzle-orm's runtime migrator. The
    // existing production ledger lives in this default schema/table pair.
    table: "__drizzle_migrations",
    schema: "drizzle",
  },
});
