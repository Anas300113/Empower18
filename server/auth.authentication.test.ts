/**
 * Independent QA tests — authentication lifecycle.
 *
 * Covers the Phase 2 AUTHENTICATION contract:
 *  - Unauthenticated request rejected
 *  - Invalid token rejected
 *  - Expired token rejected
 *  - Valid authenticated request accepted
 *  - Logout clears the usable session (and, required for security, revokes
 *    the server-side token — currently a known gap, tracked as P1)
 *
 * These tests exercise the REAL middlewares and session helpers. They do not
 * modify production code.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { createContext } from "./_core/context";
import { ADMIN_USER, STUDENT_A, makeUser } from "./_tests/helpers/fixtures";
import {
  makeContext,
  makeRequest,
  makeResponse,
} from "./_tests/helpers/context";
import {
  COOKIE_NAME,
  UNAUTHED_ERR_MSG,
} from "@shared/const";

/** Probe router exposes the protected/admin middleware contracts directly. */
const probeRouter = router({
  echoMe: protectedProcedure.query(({ ctx }) => ctx.user),
  echoAdmin: adminProcedure.query(() => "admin-ok"),
});

const TEST_SECRET = "qa-test-secret-min-32-chars-long-enough-xx";
const TEST_PROJECT = "qa-project-id";

beforeEach(() => {
  vi.stubEnv("MANUS_JWT_SECRET", TEST_SECRET);
  vi.stubEnv("MANUS_PROJECT_ID", TEST_PROJECT);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AUTHENTICATION — unauthenticated requests", () => {
  it("rejects an unauthenticated request to a protected procedure", async () => {
    const caller = probeRouter.createCaller(makeContext(null));
    await expect(caller.echoMe()).rejects.toMatchObject({
      name: "TRPCError",
      code: "UNAUTHORIZED",
      message: UNAUTHED_ERR_MSG,
    });
  });

  it("rejects an unauthenticated request to an admin procedure", async () => {
    const caller = probeRouter.createCaller(makeContext(null));
    await expect(caller.echoAdmin()).rejects.toMatchObject({
      name: "TRPCError",
      code: "UNAUTHORIZED",
    });
  });

  it("createContext yields a null user when no session is present", async () => {
    const ctx = await createContext({
      req: makeRequest(),
      res: makeResponse(),
    });
    expect(ctx.user).toBeNull();
  });
});

describe("AUTHENTICATION — token validation", () => {
  it("rejects an invalid (malformed) token", async () => {
    expect(await sdk.verifySession("not-a-jwt")).toBeNull();
    expect(await sdk.verifySession("")).toBeNull();
    expect(await sdk.verifySession(undefined)).toBeNull();
  });

  it("rejects a well-formed JWT signed with the wrong secret", async () => {
    const foreign =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcGVuSWQiOiJhdHRhY2tlciIsImFwcElkIjoicXEifQ.attackerSignature";
    expect(await sdk.verifySession(foreign)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const expired = await sdk.signSession(
      { openId: "qa-expired", appId: TEST_PROJECT, name: "Expired" },
      { expiresInMs: -1_000 }
    );
    expect(await sdk.verifySession(expired)).toBeNull();
  });

  it("rejects a token minted for a different project/app id", async () => {
    vi.stubEnv("MANUS_PROJECT_ID", "other-project");
    const foreign = await sdk.signSession({
      openId: "qa-cross-project",
      appId: "other-project",
      name: "Cross",
    });
    vi.unstubAllEnvs();
    vi.stubEnv("MANUS_JWT_SECRET", TEST_SECRET);
    vi.stubEnv("MANUS_PROJECT_ID", TEST_PROJECT);
    expect(await sdk.verifySession(foreign)).toBeNull();
  });

  it("accepts a valid authenticated token and resolves the identity", async () => {
    const token = await sdk.signSession({
      openId: STUDENT_A.openId,
      appId: TEST_PROJECT,
      name: STUDENT_A.name!,
    });
    const session = await sdk.verifySession(token);
    expect(session).toEqual({
      openId: STUDENT_A.openId,
      appId: TEST_PROJECT,
      name: STUDENT_A.name!,
    });
  });
});

describe("AUTHENTICATION — valid authenticated request accepted", () => {
  it("auth.me returns the authenticated user from context", async () => {
    const caller = appRouter.createCaller(makeContext(STUDENT_A));
    const me = await caller.auth.me();
    expect(me).toMatchObject({ openId: STUDENT_A.openId, id: STUDENT_A.id });
  });

  it("fail-closed: an invalid cookie never authenticates a request", async () => {
    const ctx = await createContext({
      req: makeRequest({
        cookie: `${COOKIE_NAME}=definitely-not-a-valid-token`,
      }),
      res: makeResponse(),
    });
    expect(ctx.user).toBeNull();
  });

  it("rejects a Supabase-style JWT presented by the client", async () => {
    // Supabase Auth is not yet wired into createContext; any foreign JWT must
    // fail closed rather than authenticate.
    const ctx = await createContext({
      req: makeRequest({
        authorization:
          "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzdXBhYmFzZS11c2VyIn0.sig",
      }),
      res: makeResponse(),
    });
    expect(ctx.user).toBeNull();
  });
});

describe("AUTHENTICATION — logout", () => {
  it("clears the session cookie with security options", async () => {
    const cleared: { name: string; options: Record<string, unknown> }[] = [];
    const caller = appRouter.createCaller(
      makeContext(STUDENT_A, makeRequest(), makeResponse(cleared))
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

  it("does not claim to revoke Supabase access tokens server-side", async () => {
    const cleared: { name: string; options: Record<string, unknown> }[] = [];
    const caller = appRouter.createCaller(
      makeContext(STUDENT_A, makeRequest(), makeResponse(cleared))
    );
    await expect(caller.auth.logout()).resolves.toEqual({ success: true });
    expect(cleared).toHaveLength(1);
  });
});

describe("AUTHENTICATION — fixture sanity", () => {
  it("student fixtures are non-admin", () => {
    const student = makeUser({ role: "user" });
    expect(student.role).toBe("user");
    expect(student.role).not.toBe("admin");
  });

  it("admin fixture is distinct from students", () => {
    expect(ADMIN_USER.role).toBe("admin");
    expect(STUDENT_A.role).toBe("user");
    expect(STUDENT_A.openId).not.toBe(ADMIN_USER.openId);
  });
});
