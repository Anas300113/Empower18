/**
 * QA-owned test fixtures. Independent of implementation panes.
 * Do NOT import these from production code.
 */
import type { User } from "../../../drizzle/schema";

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "qa-default-user",
    name: "QA Default User",
    email: "qa.default@example.com",
    loginMethod: "email",
    role: "user",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    lastSignedIn: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

/** Two distinct students for ownership/isolation tests. */
export const STUDENT_A = makeUser({
  id: 101,
  openId: "qa-student-a",
  name: "Student A",
  email: "student.a@example.com",
});

export const STUDENT_B = makeUser({
  id: 102,
  openId: "qa-student-b",
  name: "Student B",
  email: "student.b@example.com",
});

export const ADMIN_USER = makeUser({
  id: 999,
  openId: "qa-admin",
  name: "QA Admin",
  email: "admin@example.com",
  role: "admin",
});
