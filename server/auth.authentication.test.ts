import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import { createContext } from "./_core/context";
import { ADMIN_USER, STUDENT_A } from "./_tests/helpers/fixtures";
import {
  makeContext,
  makeRequest,
  makeResponse,
} from "./_tests/helpers/context";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from "@shared/const";

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

const probeRouter = router({
  echoMe: protectedProcedure.query(({ ctx }) => ctx.user),
  echoAdmin: adminProcedure.query(() => "admin-ok"),
});

beforeEach(() => {
  mocks.verifySupabaseToken.mockReset().mockResolvedValue(null);
  mocks.getUserRoles.mockReset().mockResolvedValue([]);
  mocks.ensureStudentRole.mockReset().mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Supabase authentication context", () => {
  it("rejects unauthenticated access to protected procedures", async () => {
    const caller = probeRouter.createCaller(makeContext(null));
    await expect(caller.echoMe()).rejects.toMatchObject({
      name: "TRPCError",
      code: "UNAUTHORIZED",
      message: UNAUTHED_ERR_MSG,
    });
  });

  it("rejects unauthenticated access to admin procedures", async () => {
    const caller = probeRouter.createCaller(makeContext(null));
    await expect(caller.echoAdmin()).rejects.toMatchObject({
      name: "TRPCError",
      code: "UNAUTHORIZED",
    });
  });

  it("leaves public requests unauthenticated when no bearer token is supplied", async () => {
    const context = await createContext({
      req: makeRequest(),
      res: makeResponse(),
    });
    expect(context.user).toBeNull();
    expect(mocks.verifySupabaseToken).not.toHaveBeenCalled();
  });

  it("fails closed when Supabase rejects a bearer token", async () => {
    const context = await createContext({
      req: makeRequest({ authorization: "Bearer invalid-token" }),
      res: makeResponse(),
    });
    expect(context.user).toBeNull();
    expect(mocks.verifySupabaseToken).toHaveBeenCalledWith("invalid-token");
    expect(mocks.getUserRoles).not.toHaveBeenCalled();
  });

  it("does not authenticate a legacy Manus session cookie", async () => {
    const context = await createContext({
      req: makeRequest({ cookie: `${COOKIE_NAME}=legacy-session-token` }),
      res: makeResponse(),
    });
    expect(context.user).toBeNull();
    expect(mocks.verifySupabaseToken).not.toHaveBeenCalled();
  });

  it("builds the request identity from Supabase and database roles", async () => {
    const id = "00000000-0000-4000-8000-000000000123";
    mocks.verifySupabaseToken.mockResolvedValue({
      id,
      email: "admin@example.com",
      name: "Admin",
      rawUserMetaData: { role: "student" },
    });
    mocks.getUserRoles.mockResolvedValue(["admin"]);

    const context = await createContext({
      req: makeRequest({ authorization: "Bearer valid-supabase-token" }),
      res: makeResponse(),
    });

    expect(context.user).toEqual({
      id,
      email: "admin@example.com",
      name: "Admin",
      roles: ["admin"],
    });
    expect(mocks.getUserRoles).toHaveBeenCalledWith(id);
    expect(mocks.ensureStudentRole).not.toHaveBeenCalled();
  });

  it("provisions only the default student role for a new Supabase user", async () => {
    const id = "00000000-0000-4000-8000-000000000456";
    mocks.verifySupabaseToken.mockResolvedValue({
      id,
      email: "new.student@example.com",
      name: "New Student",
      rawUserMetaData: { role: "admin" },
    });
    mocks.getUserRoles.mockResolvedValue([]);

    const context = await createContext({
      req: makeRequest({ authorization: "Bearer new-user-token" }),
      res: makeResponse(),
    });

    expect(mocks.ensureStudentRole).toHaveBeenCalledWith(id);
    expect(context.user?.roles).toEqual(["student"]);
  });

  it("fails closed when role lookup fails", async () => {
    mocks.verifySupabaseToken.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000789",
      email: "student@example.com",
      name: "Student",
      rawUserMetaData: null,
    });
    mocks.getUserRoles.mockRejectedValue(new Error("database unavailable"));

    const context = await createContext({
      req: makeRequest({ authorization: "Bearer valid-but-role-query-fails" }),
      res: makeResponse(),
    });
    expect(context.user).toBeNull();
  });

  it("auth.me returns the authenticated context user", async () => {
    const caller = appRouter.createCaller(makeContext(STUDENT_A));
    const me = await caller.auth.me();
    expect(me).toMatchObject({ id: STUDENT_A.id, openId: STUDENT_A.openId });
  });

  it("logout clears any stale legacy cookie with secure options", async () => {
    const cleared: { name: string; options: Record<string, unknown> }[] = [];
    const caller = appRouter.createCaller(
      makeContext(ADMIN_USER, makeRequest(), makeResponse(cleared))
    );
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(cleared).toHaveLength(1);
    expect(cleared[0]?.name).toBe(COOKIE_NAME);
    expect(cleared[0]?.options).toMatchObject({
      maxAge: -1,
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
  });
});
