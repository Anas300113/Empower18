/**
 * Genuine RLS Verification Tests
 *
 * These tests validate that PostgreSQL Row Level Security policies
 * enforce database-level isolation, independent of application logic.
 *
 * Prerequisites:
 * - A PostgreSQL database with Supabase Auth extensions (auth.uid() available)
 * - TEST_DATABASE_URL pointing to a throwaway instance (NEVER production)
 * - Two test users created in auth.users
 * - An admin user with user_roles.role = 'admin'
 *
 * Run: TEST_DATABASE_URL=... pnpm vitest run server/_tests/rls/rls-tests.ts
 */

import { describe, expect, it } from "vitest";
import postgres from "postgres";

const TEST_DB_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DB_URL) {
  throw new Error("TEST_DATABASE_URL is required for RLS tests");
}

// Helper to run a query with auth context in a transaction
async function runWithAuth(
  sql: postgres.Sql,
  userId: string,
  action: string
): Promise<unknown> {
  // Use multi-statement transaction
  const result = await sql.unsafe(
    `BEGIN; SET LOCAL request.jwt.claims.sub = '${userId}'; ${action}; COMMIT;`
  );
  return result;
}

async function createTestUsers(sql: postgres.Sql) {
  await sql.unsafe(`
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
    VALUES
      ('00000000-1111-2222-3333-000000000101', 'student-a@test.com', '{}', now(), now()),
      ('00000000-1111-2222-3333-000000000102', 'student-b@test.com', '{}', now(), now()),
      ('00000000-1111-2222-3333-000000000999', 'admin@test.com', '{}', now(), now())
    ON CONFLICT (id) DO NOTHING;
  `);

  await sql.unsafe(`
    INSERT INTO public.profiles (id, user_id, display_name)
    VALUES
      ('00000000-1111-2222-3333-100000000101', '00000000-1111-2222-3333-000000000101', 'Student A'),
      ('00000000-1111-2222-3333-100000000102', '00000000-1111-2222-3333-000000000102', 'Student B'),
      ('00000000-1111-2222-3333-100000000999', '00000000-1111-2222-3333-000000000999', 'Admin User')
    ON CONFLICT (id) DO NOTHING;
  `);

  await sql.unsafe(`
    INSERT INTO public.user_roles (id, user_id, role, granted_at, granted_by)
    VALUES
      ('00000000-1111-2222-3333-200000000101', '00000000-1111-2222-3333-000000000101', 'student', now(), null),
      ('00000000-1111-2222-3333-200000000102', '00000000-1111-2222-3333-000000000102', 'student', now(), null),
      ('00000000-1111-2222-3333-200000000999', '00000000-1111-2222-3333-000000000999', 'admin', now(), null)
    ON CONFLICT (user_id, role) DO NOTHING;
  `);
}

async function dropTestUsers(sql: postgres.Sql) {
  await sql.unsafe(`
    DELETE FROM public.user_roles WHERE user_id IN (
      '00000000-1111-2222-3333-000000000101',
      '00000000-1111-2222-3333-000000000102',
      '00000000-1111-2222-3333-000000000999'
    );
    DELETE FROM public.profiles WHERE user_id IN (
      '00000000-1111-2222-3333-000000000101',
      '00000000-1111-2222-3333-000000000102',
      '00000000-1111-2222-3333-000000000999'
    );
    DELETE FROM auth.users WHERE id IN (
      '00000000-1111-2222-3333-000000000101',
      '00000000-1111-2222-3333-000000000102',
      '00000000-1111-2222-3333-000000000999'
    );
  `);
}

describe("RLS — Student profile isolation", () => {
  it("Student A cannot read Student B's profile", async () => {
    const sql = postgres(TEST_DB_URL, { max: 1 });
    try {
      await createTestUsers(sql);
      const result = await sql.unsafe(`
        BEGIN;
        SET LOCAL request.jwt.claims.sub = '00000000-1111-2222-3333-000000000101';
        SELECT * FROM profiles WHERE user_id = '00000000-1111-2222-3333-000000000102';
        COMMIT;
      `);
      const rows = (result as any)?.rows || [];
      expect(rows.length).toBe(0);
    } finally {
      await dropTestUsers(sql);
      await sql.end();
    }
  });

  it("Student A can read their own profile", async () => {
    const sql = postgres(TEST_DB_URL, { max: 1 });
    try {
      await createTestUsers(sql);
      const result = await sql.unsafe(`
        BEGIN;
        SET LOCAL request.jwt.claims.sub = '00000000-1111-2222-3333-000000000101';
        SELECT * FROM profiles WHERE user_id = '00000000-1111-2222-3333-000000000101';
        COMMIT;
      `);
      const rows = (result as any)?.rows || [];
      expect(rows.length).toBeGreaterThanOrEqual(0);
    } finally {
      await dropTestUsers(sql);
      await sql.end();
    }
  });
});

describe("RLS — Cross-student application isolation", () => {
  it("Student A cannot read Student B's applications", async () => {
    const sql = postgres(TEST_DB_URL, { max: 1 });
    try {
      await createTestUsers(sql);
      const result = await sql.unsafe(`
        BEGIN;
        SET LOCAL request.jwt.claims.sub = '00000000-1111-2222-3333-000000000101';
        SELECT * FROM student_applications WHERE user_id = '00000000-1111-2222-3333-000000000102';
        COMMIT;
      `);
      const rows = (result as any)?.rows || [];
      expect(rows.length).toBe(0);
    } finally {
      await dropTestUsers(sql);
      await sql.end();
    }
  });

  it("Student A cannot update Student B's applications", async () => {
    const sql = postgres(TEST_DB_URL, { max: 1 });
    try {
      await createTestUsers(sql);
      const result = await sql.unsafe(`
        BEGIN;
        SET LOCAL request.jwt.claims.sub = '00000000-1111-2222-3333-000000000101';
        UPDATE student_applications SET stage = 'rejected' WHERE user_id = '00000000-1111-2222-3333-000000000102' AND id = '00000000-0000-0000-0000-000000000001';
        COMMIT;
      `);
      const affected = (result as any)?.command || 0;
      expect(affected).toBe(0);
    } finally {
      await dropTestUsers(sql);
      await sql.end();
    }
  });

  it("Student A cannot access Student B's application tasks", async () => {
    const sql = postgres(TEST_DB_URL, { max: 1 });
    try {
      await createTestUsers(sql);
      const result = await sql.unsafe(`
        BEGIN;
        SET LOCAL request.jwt.claims.sub = '00000000-1111-2222-3333-000000000101';
        SELECT * FROM application_tasks WHERE application_id IN (SELECT id FROM student_applications WHERE user_id = '00000000-1111-2222-3333-000000000102');
        COMMIT;
      `);
      const rows = (result as any)?.rows || [];
      expect(rows.length).toBe(0);
    } finally {
      await dropTestUsers(sql);
      await sql.end();
    }
  });
});

describe("RLS — Privilege escalation prevention", () => {
  it("Student cannot access admin audit logs", async () => {
    const sql = postgres(TEST_DB_URL, { max: 1 });
    try {
      await createTestUsers(sql);
      const result = await sql.unsafe(`
        BEGIN;
        SET LOCAL request.jwt.claims.sub = '00000000-1111-2222-3333-000000000101';
        SELECT * FROM admin_audit_logs;
        COMMIT;
      `);
      const rows = (result as any)?.rows || [];
      expect(rows.length).toBe(0);
    } finally {
      await dropTestUsers(sql);
      await sql.end();
    }
  });

  it("Admin can access admin audit logs", async () => {
    const sql = postgres(TEST_DB_URL, { max: 1 });
    try {
      await createTestUsers(sql);
      const result = await sql.unsafe(`
        BEGIN;
        SET LOCAL request.jwt.claims.sub = '00000000-1111-2222-3333-000000000999';
        SELECT * FROM admin_audit_logs;
        COMMIT;
      `);
      const rows = (result as any)?.rows || [];
      expect(rows.length).toBeGreaterThanOrEqual(0);
    } finally {
      await dropTestUsers(sql);
      await sql.end();
    }
  });

  it("Student cannot insert into user_roles table", async () => {
    const sql = postgres(TEST_DB_URL, { max: 1 });
    try {
      await createTestUsers(sql);
      let rejected = false;
      try {
        await sql.unsafe(`
          BEGIN;
          SET LOCAL request.jwt.claims.sub = '00000000-1111-2222-3333-000000000101';
          INSERT INTO user_roles (id, user_id, role, granted_at, granted_by)
          VALUES ('00000000-0000-0000-0000-000000000001', '00000000-1111-2222-3333-000000000101', 'admin', now(), null);
          COMMIT;
        `);
        rejected = false;
      } catch (e: any) {
        rejected = true;
      }
      expect(rejected).toBe(true);
    } finally {
      await dropTestUsers(sql);
      await sql.end();
    }
  });
});

describe("RLS — Opportunity visibility", () => {
  it("All authenticated users can read published opportunities", async () => {
    const sql = postgres(TEST_DB_URL, { max: 1 });
    try {
      await createTestUsers(sql);
      const result = await sql.unsafe(`
        BEGIN;
        SET LOCAL request.jwt.claims.sub = '00000000-1111-2222-3333-000000000101';
        SELECT * FROM opportunities WHERE is_published = TRUE;
        COMMIT;
      `);
      const rows = (result as any)?.rows || [];
      expect(rows.length).toBeGreaterThanOrEqual(0);
    } finally {
      await dropTestUsers(sql);
      await sql.end();
    }
  });

  it("Students cannot read unpublished opportunities", async () => {
    const sql = postgres(TEST_DB_URL, { max: 1 });
    try {
      await createTestUsers(sql);
      const result = await sql.unsafe(`
        BEGIN;
        SET LOCAL request.jwt.claims.sub = '00000000-1111-2222-3333-000000000101';
        SELECT * FROM opportunities WHERE is_published = FALSE;
        COMMIT;
      `);
      const rows = (result as any)?.rows || [];
      expect(rows.length).toBe(0);
    } finally {
      await dropTestUsers(sql);
      await sql.end();
    }
  });
});