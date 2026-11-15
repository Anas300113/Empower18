import { describe, expect, it, vi } from "vitest";
import { makeRequest, makeResponse } from "./_tests/helpers/context";

const mocks = vi.hoisted(() => ({
  verifySupabaseToken: vi.fn(),
  getUserRoles: vi.fn(),
  ensureStudentRole: vi.fn(),
}));

vi.mock("./_core/supabase", () => ({
  verifySupabaseToken: mocks.verifySupabaseToken,
}));
vi.mock("./db/profile", () => ({
  getUserRoles: mocks.getUserRoles,
  ensureStudentRole: mocks.ensureStudentRole,
}));

import { createContext } from "./_core/context";

describe("Supabase first-auth role provisioning", () => {
  it("provisions a student role for a new authenticated user", async () => {
    mocks.verifySupabaseToken.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000123",
      email: "new.student@example.com",
      name: "New Student",
      rawUserMetaData: { name: "New Student" },
    });
    mocks.getUserRoles.mockResolvedValue([]);
    mocks.ensureStudentRole.mockResolvedValue(true);

    const context = await createContext({
      req: makeRequest({ authorization: "Bearer valid-supabase-token" }),
      res: makeResponse(),
    });

    expect(mocks.ensureStudentRole).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000123"
    );
    expect(context.user?.roles).toEqual(["student"]);
  });

  it("does not downgrade an existing non-student role", async () => {
    mocks.verifySupabaseToken.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000999",
      email: "admin@example.com",
      name: "Admin",
      rawUserMetaData: null,
    });
    mocks.getUserRoles.mockResolvedValue(["admin"]);
    mocks.ensureStudentRole.mockClear();

    const context = await createContext({
      req: makeRequest({ authorization: "Bearer valid-admin-token" }),
      res: makeResponse(),
    });

    expect(mocks.ensureStudentRole).not.toHaveBeenCalled();
    expect(context.user?.roles).toEqual(["admin"]);
  });
});
