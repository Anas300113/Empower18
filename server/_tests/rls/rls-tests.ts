/**
 * Genuine RLS verification tests.
 *
 * These run only against TEST_DATABASE_URL, which must be a disposable local
 * or CI database initialized by prepare-test-db.ts and the checked-in Drizzle
 * migrations. Never point this suite at production.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import postgres from "postgres";

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
if (TEST_DB_URL) {
  const databaseHost = new URL(TEST_DB_URL).hostname.replace(/^\[|\]$/g, "");
  if (!["localhost", "127.0.0.1", "::1"].includes(databaseHost)) {
    throw new Error(
      "RLS tests refuse remote databases; use a disposable loopback-only PostgreSQL instance."
    );
  }
}
const describeWithDatabase = describe.skipIf(!TEST_DB_URL);

type TestIds = {
  studentA: string;
  studentB: string;
  admin: string;
  profileA: string;
  profileB: string;
  publishedOpportunity: string;
  unpublishedOpportunity: string;
  applicationA: string;
  applicationB: string;
  taskB: string;
  auditLog: string;
};
type TestSubject = "studentA" | "studentB" | "admin";

const ROLLBACK = Symbol("rollback RLS fixture transaction");

/**
 * Create temporary fixtures as the database owner, then switch to the real
 * PostgreSQL authenticated role for assertions. The outer transaction always
 * rolls back, including on assertion failure, so fixtures cannot be left behind.
 */
async function withAuthenticatedUser(
  subject: TestSubject,
  run: (tx: postgres.TransactionSql, ids: TestIds) => Promise<void>
): Promise<void> {
  if (!TEST_DB_URL) throw new Error("TEST_DATABASE_URL is required");
  const sql = postgres(TEST_DB_URL, { max: 1 });
  const ids: TestIds = {
    studentA: randomUUID(),
    studentB: randomUUID(),
    admin: randomUUID(),
    profileA: randomUUID(),
    profileB: randomUUID(),
    publishedOpportunity: randomUUID(),
    unpublishedOpportunity: randomUUID(),
    applicationA: randomUUID(),
    applicationB: randomUUID(),
    taskB: randomUUID(),
    auditLog: randomUUID(),
  };
  const userId = ids[subject];

  try {
    try {
      await sql.begin(async tx => {
        const authUsers = [
          [ids.studentA, `rls-${ids.studentA}@test.invalid`],
          [ids.studentB, `rls-${ids.studentB}@test.invalid`],
          [ids.admin, `rls-${ids.admin}@test.invalid`],
        ];
        for (const [id, email] of authUsers) {
          await tx`
              INSERT INTO auth.users (id, email, raw_user_meta_data)
              VALUES (${id}, ${email}, '{}'::jsonb)
            `;
        }

        await tx`
            INSERT INTO public.profiles (id, user_id, display_name)
            VALUES
              (${ids.profileA}, ${ids.studentA}, 'RLS Student A'),
              (${ids.profileB}, ${ids.studentB}, 'RLS Student B')
          `;
        await tx`
            INSERT INTO public.user_roles (user_id, role)
            VALUES
              (${ids.studentA}, 'student'),
              (${ids.studentB}, 'student'),
              (${ids.admin}, 'admin')
          `;
        await tx`
            INSERT INTO public.opportunities
              (id, title, description, type, status, is_published)
            VALUES
              (${ids.publishedOpportunity}, 'RLS published', 'Fixture', 'internship', 'published', TRUE),
              (${ids.unpublishedOpportunity}, 'RLS unpublished', 'Fixture', 'internship', 'draft', FALSE)
          `;
        await tx`
            INSERT INTO public.student_applications (id, user_id, opportunity_id)
            VALUES
              (${ids.applicationA}, ${ids.studentA}, ${ids.publishedOpportunity}),
              (${ids.applicationB}, ${ids.studentB}, ${ids.publishedOpportunity})
          `;
        await tx`
            INSERT INTO public.application_tasks (id, application_id, title)
            VALUES (${ids.taskB}, ${ids.applicationB}, 'RLS private task')
          `;
        await tx`
            INSERT INTO public.admin_audit_logs
              (id, actor_user_id, action, target_type, target_id)
            VALUES (${ids.auditLog}, ${ids.admin}, 'rls.fixture', 'test', ${ids.auditLog})
          `;

        await tx.unsafe("SET LOCAL ROLE authenticated");
        await tx`
            SELECT set_config(
              'request.jwt.claims',
              ${JSON.stringify({ sub: userId, role: "authenticated" })},
              true
            )
          `;
        await run(tx, ids);
        throw ROLLBACK;
      });
    } catch (error) {
      if (error !== ROLLBACK) throw error;
    }
  } finally {
    await sql.end();
  }
}

describeWithDatabase("RLS — student profile isolation", () => {
  it("lets a student read their own profile", async () => {
    await withAuthenticatedUser("studentA", async (tx, ids) => {
      const rows = await tx`
        SELECT id, display_name FROM public.profiles WHERE user_id = ${ids.studentA}
      `;
      expect(rows.map(row => row.id)).toEqual([ids.profileA]);
      expect(rows[0]?.display_name).toBe("RLS Student A");
    });
  });

  it("prevents a student from reading another student's profile", async () => {
    await withAuthenticatedUser("studentA", async (tx, ids) => {
      const rows = await tx`
        SELECT id FROM public.profiles WHERE user_id = ${ids.studentB}
      `;
      expect(rows).toHaveLength(0);
    });
  });
});

describeWithDatabase("RLS — cross-student application isolation", () => {
  it("prevents reading another student's application", async () => {
    await withAuthenticatedUser("studentA", async (tx, ids) => {
      const rows = await tx`
        SELECT id FROM public.student_applications WHERE id = ${ids.applicationB}
      `;
      expect(rows).toHaveLength(0);
    });
  });

  it("prevents updating another student's application", async () => {
    await withAuthenticatedUser("studentA", async (tx, ids) => {
      const rows = await tx`
        UPDATE public.student_applications
        SET stage = 'rejected'
        WHERE id = ${ids.applicationB}
        RETURNING id
      `;
      expect(rows).toHaveLength(0);
    });
  });

  it("prevents reading tasks attached to another student's application", async () => {
    await withAuthenticatedUser("studentA", async (tx, ids) => {
      const rows = await tx`
        SELECT id FROM public.application_tasks WHERE id = ${ids.taskB}
      `;
      expect(rows).toHaveLength(0);
    });
  });
});

describeWithDatabase("RLS — role escalation and admin records", () => {
  it("prevents a student from reading admin audit logs", async () => {
    await withAuthenticatedUser("studentA", async (tx, ids) => {
      const rows = await tx`
        SELECT id FROM public.admin_audit_logs WHERE id = ${ids.auditLog}
      `;
      expect(rows).toHaveLength(0);
    });
  });

  it("lets an administrator read audit logs", async () => {
    await withAuthenticatedUser("admin", async (tx, ids) => {
      const rows = await tx`
        SELECT id FROM public.admin_audit_logs WHERE id = ${ids.auditLog}
      `;
      expect(rows.map(row => row.id)).toEqual([ids.auditLog]);
    });
  });

  it("prevents a student from inserting an admin role", async () => {
    await withAuthenticatedUser("studentA", async (tx, ids) => {
      await expect(tx`
        INSERT INTO public.user_roles (user_id, role)
        VALUES (${ids.studentA}, 'admin')
      `).rejects.toThrow();
    });
  });

  it("prevents a student from promoting their own role", async () => {
    await withAuthenticatedUser("studentA", async (tx, ids) => {
      const rows = await tx`
        UPDATE public.user_roles SET role = 'admin'
        WHERE user_id = ${ids.studentA} AND role = 'student'
        RETURNING role
      `;
      expect(rows).toHaveLength(0);
    });
  });
});

describeWithDatabase("RLS — opportunity visibility", () => {
  it("allows authenticated users to read published opportunities only", async () => {
    await withAuthenticatedUser("studentA", async (tx, ids) => {
      const rows = await tx`
        SELECT id FROM public.opportunities
        WHERE id IN (${ids.publishedOpportunity}, ${ids.unpublishedOpportunity})
        ORDER BY id
      `;
      expect(rows.map(row => row.id)).toEqual([ids.publishedOpportunity]);
    });
  });
});
