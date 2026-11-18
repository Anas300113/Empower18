import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import postgres from "postgres";

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
if (TEST_DB_URL) {
  const databaseHost = new URL(TEST_DB_URL).hostname.replace(/^\[|\]$/g, "");
  if (!["localhost", "127.0.0.1", "::1"].includes(databaseHost)) {
    throw new Error(
      "Integration tests refuse remote databases; use a disposable loopback-only PostgreSQL instance."
    );
  }
}
const describeWithDatabase = describe.skipIf(!TEST_DB_URL);

// The worker reads DATABASE_URL when its module loads. It is set only to the
// same disposable TEST_DATABASE_URL, never to a production connection.
if (TEST_DB_URL) vi.stubEnv("DATABASE_URL", TEST_DB_URL);

const ids = { actor: randomUUID(), opportunity: randomUUID() };
const fixtureSql = TEST_DB_URL ? postgres(TEST_DB_URL, { max: 1 }) : null;
let closeDatabase: (() => Promise<void>) | null = null;

afterAll(async () => {
  if (closeDatabase) await closeDatabase();
  if (fixtureSql) {
    try {
      await fixtureSql`
        DELETE FROM public.admin_audit_logs WHERE actor_user_id = ${ids.actor}
      `;
      await fixtureSql`DELETE FROM public.opportunities WHERE id = ${ids.opportunity}`;
      await fixtureSql`DELETE FROM public.user_roles WHERE user_id = ${ids.actor}`;
      await fixtureSql`DELETE FROM auth.users WHERE id = ${ids.actor}`;
    } finally {
      await fixtureSql.end();
    }
  }
});

describeWithDatabase("Opportunity expiry worker", () => {
  it("expires rolling listings whose explicit expiry passed", async () => {
    if (!fixtureSql) throw new Error("TEST_DATABASE_URL is required");
    await fixtureSql`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES (${ids.actor}, ${`expiry-${ids.actor}@test.invalid`}, '{}'::jsonb)
    `;
    await fixtureSql`
      INSERT INTO public.user_roles (user_id, role)
      VALUES (${ids.actor}, 'admin')
    `;
    await fixtureSql`
      INSERT INTO public.opportunities
        (id, title, description, type, status, is_published, expires_at)
      VALUES
        (${ids.opportunity}, 'Rolling expiry fixture', 'Fixture', 'internship',
         'published', TRUE, ${new Date(Date.now() - 60 * 60 * 1000)})
    `;

    vi.resetModules();
    const database = await import("../../db");
    const { expireDueOpportunities } = await import("../../db/opportunities");
    closeDatabase = database.closeDb;

    const expired = await expireDueOpportunities(ids.actor, new Date());
    expect(expired.map(item => item.id)).toContain(ids.opportunity);

    const rows = await fixtureSql`
      SELECT status, is_published FROM public.opportunities WHERE id = ${ids.opportunity}
    `;
    expect(rows).toEqual([{ status: "expired", is_published: false }]);
  });
});
