import postgres from "postgres";

const databaseUrl = process.env.TEST_DATABASE_URL;
const mode = process.argv[2];

if (!databaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL must point to a disposable local/CI database; never use production."
  );
}
const databaseHost = new URL(databaseUrl).hostname.replace(/^\[|\]$/g, "");
if (!["localhost", "127.0.0.1", "::1"].includes(databaseHost)) {
  throw new Error(
    "RLS test setup refuses remote databases; use a disposable loopback-only PostgreSQL instance."
  );
}
if (mode !== "bootstrap" && mode !== "grant") {
  throw new Error("Expected mode: bootstrap or grant");
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  if (mode === "bootstrap") {
    await sql.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
      END
      $$;

      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY,
        email text UNIQUE,
        raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $$
        SELECT NULLIF(
          current_setting('request.jwt.claims', true)::jsonb ->> 'sub',
          ''
        )::uuid
      $$;

      GRANT USAGE ON SCHEMA auth TO authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
    `);
    console.log(
      "Bootstrapped disposable test auth schema and authenticated role."
    );
  } else {
    await sql.unsafe(`
      GRANT USAGE ON SCHEMA public, auth TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
      GRANT SELECT ON auth.users TO authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
    `);
    console.log(
      "Granted table privileges to authenticated for RLS policy testing."
    );
  }
} finally {
  await sql.end();
}
