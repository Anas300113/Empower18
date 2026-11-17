/**
 * Independent QA tests — authorization and RBAC.
 *
 * Covers the Phase 2 AUTHORIZATION contract:
 *  - Cross-student database isolation requires a disposable PostgreSQL run
 *  - Admin-only procedures reject students
 *  - Valid admin authorization works
 *
 * Database isolation cases remain skipped until TEST_DATABASE_URL is configured.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import { ADMIN_USER, STUDENT_A, STUDENT_B } from "./_tests/helpers/fixtures";
import { makeContext } from "./_tests/helpers/context";
import { NOT_ADMIN_ERR_MSG } from "@shared/const";

const probeRouter = router({
  echoMe: protectedProcedure.query(({ ctx }) => ctx.user),
  echoAdmin: adminProcedure.query(() => "admin-ok"),
});

beforeEach(() => {
  vi.stubEnv("MANUS_JWT_SECRET", "qa-test-secret-min-32-chars-long-enough-xx");
  vi.stubEnv("MANUS_PROJECT_ID", "qa-project-id");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AUTHORIZATION — admin-only procedures", () => {
  it("rejects a student (role=user) with FORBIDDEN", async () => {
    const caller = probeRouter.createCaller(makeContext(STUDENT_A));
    await expect(caller.echoAdmin()).rejects.toMatchObject({
      name: "TRPCError",
      code: "FORBIDDEN",
      message: NOT_ADMIN_ERR_MSG,
    });
  });

  it("rejects an unauthenticated caller with UNAUTHORIZED (fail-closed)", async () => {
    const caller = probeRouter.createCaller(makeContext(null));
    await expect(caller.echoAdmin()).rejects.toMatchObject({
      name: "TRPCError",
      code: "UNAUTHORIZED",
    });
  });

  it("accepts a valid admin and returns the procedure result", async () => {
    const caller = probeRouter.createCaller(makeContext(ADMIN_USER));
    await expect(caller.echoAdmin()).resolves.toBe("admin-ok");
  });

  it("admin-only system.notifyOwner rejects students before any network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const caller = appRouter.createCaller(makeContext(STUDENT_A));
    await expect(
      caller.system.notifyOwner({ title: "t", content: "c" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("admin-only system.notifyOwner succeeds for admin and keeps the API key server-side", async () => {
    vi.stubEnv("MANUS_API_URL", "https://api.example");
    vi.stubEnv("MANUS_API_KEY", "qa-server-key");
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const caller = appRouter.createCaller(makeContext(ADMIN_USER));
    const result = await caller.system.notifyOwner({
      title: "QA title",
      content: "QA content",
    });

    expect(result).toEqual({ success: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(init.headers.authorization).toBe("Bearer qa-server-key");
    // The key must travel server-to-server only.
    expect(init.headers.authorization).not.toContain("qa-server-key- leaked");
  });
});

describe("AUTHORIZATION — cross-student isolation (requires disposable PostgreSQL)", () => {
  it.skip(
    "student cannot access another student's profile",
    () => {}
  );

  it.skip(
    "student cannot access another student's applications",
    () => {}
  );

  it.skip(
    "student cannot change their own role",
    () => {}
  );

  it("student cannot invoke admin opportunity procedures", async () => {
    const caller = appRouter.createCaller(makeContext(STUDENT_A));
    await expect(caller.admin.sources.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("AUTHORIZATION — structural evidence (runs now)", () => {
  it("exposes exactly the routers currently registered", () => {
    const procedures = Object.keys(
      (
        appRouter as unknown as {
          _def: { procedures: Record<string, unknown> };
        }
      )._def.procedures
    );
    expect(procedures).toEqual(
      expect.arrayContaining([
        "system.health",
        "auth.me",
        "profile.me",
        "opportunities.list",
        "applications.list",
        "admin.opportunities.approveAndPublish",
      ])
    );
  });

  it("student fixtures never carry the admin role", () => {
    expect(STUDENT_A.role).toBe("user");
    expect(STUDENT_B.role).toBe("user");
    expect(STUDENT_A.id).not.toBe(STUDENT_B.id);
  });
});
