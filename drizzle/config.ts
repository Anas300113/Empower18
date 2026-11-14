import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/migrations",
  schema: "./drizzle/schema.ts",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  migrations: {
    table: "drizzle_migrations",
    schema: "public",
    prefix: "0001_",
  },
  verbose: true,
  strict: true,
});