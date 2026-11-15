import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { makeContext } from "./_tests/helpers/context";
import { ADMIN_USER, STUDENT_A } from "./_tests/helpers/fixtures";

describe("opportunity API authorization", () => {
  it("exposes public opportunity filters without authentication", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.opportunities.filters()).resolves.toMatchObject({
      districts: expect.arrayContaining(["Warwick"]),
      routes: expect.arrayContaining(["Apprenticeship"]),
    });
  });

  it("rejects student access to admin dashboard before database access", async () => {
    const caller = appRouter.createCaller(makeContext(STUDENT_A));
    await expect(caller.admin.dashboard()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects unauthenticated saves", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(
      caller.opportunities.save({
        opportunityId: "00000000-0000-4000-8000-000000000001",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects unauthenticated application tracking before database access", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(
      caller.applications.create({
        opportunityId: "00000000-0000-4000-8000-000000000001",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("validates admin draft input before attempting persistence", async () => {
    const caller = appRouter.createCaller(makeContext(ADMIN_USER));
    await expect(
      caller.admin.opportunities.createDraft({
        title: "",
        description: "",
        type: "apprenticeship",
        isRemoteEligible: false,
        requiredSkills: [],
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects unrecognised source update fields before persistence", async () => {
    const caller = appRouter.createCaller(makeContext(ADMIN_USER));
    await expect(
      caller.admin.sources.update({
        id: "00000000-0000-4000-8000-000000000001",
        changes: { unexpectedPrivilege: true },
      } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects empty organisation updates before persistence", async () => {
    const caller = appRouter.createCaller(makeContext(ADMIN_USER));
    await expect(
      caller.admin.organisations.update({
        id: "00000000-0000-4000-8000-000000000001",
        changes: {},
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
