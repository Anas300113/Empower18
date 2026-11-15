/** Test identities used by authentication and authorization tests. */
import type { AuthenticatedUser } from "../../_core/context";

export type QaUser = AuthenticatedUser & {
  openId: string;
  role: string;
};

export function makeUser(overrides: Partial<QaUser> = {}): QaUser {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    openId: "qa-default-user",
    name: "QA Default User",
    email: "qa.default@example.com",
    roles: ["student"],
    role: "user",
    ...overrides,
  };
}

export const STUDENT_A = makeUser({
  id: "00000000-0000-4000-8000-000000000101",
  openId: "qa-student-a",
  name: "Student A",
  email: "student.a@example.com",
});

export const STUDENT_B = makeUser({
  id: "00000000-0000-4000-8000-000000000102",
  openId: "qa-student-b",
  name: "Student B",
  email: "student.b@example.com",
});

export const ADMIN_USER = makeUser({
  id: "00000000-0000-4000-8000-000000000999",
  openId: "qa-admin",
  name: "QA Admin",
  email: "admin@example.com",
  role: "admin",
  roles: ["admin"],
});
