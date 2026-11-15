import { describe, expect, it, vi } from "vitest";
import { profileRouter } from "./routers/profile";
import { makeContext } from "./_tests/helpers/context";
import { STUDENT_A } from "./_tests/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  getFullProfile: vi.fn(),
  upsertProfile: vi.fn(),
  upsertStudentProfile: vi.fn(),
  ensureStudentRole: vi.fn(),
}));

vi.mock("./db/profile", () => mocks);

describe("student onboarding persistence", () => {
  it("persists the profile and onboarding submission for a new student", async () => {
    const profile = { id: "profile-1", userId: STUDENT_A.id, displayName: "Student A" };
    const studentProfile = {
      id: "student-profile-1",
      userId: STUDENT_A.id,
      ageBand: "16–17",
      district: "Warwick",
      interests: ["Technology"],
      routesOfInterest: ["Apprenticeship"],
      onboardingCompleted: true,
    };
    mocks.upsertProfile.mockResolvedValue(profile);
    mocks.upsertStudentProfile.mockResolvedValue(studentProfile);

    const caller = profileRouter.createCaller(makeContext(STUDENT_A));
    await expect(
      caller.update({ displayName: "Student A" })
    ).resolves.toEqual({ profile });
    await expect(
      caller.onboarding({
        ageBand: "16–17",
        district: "Warwick",
        interests: ["Technology"],
        routesOfInterest: ["Apprenticeship"],
        onboardingCompleted: true,
      })
    ).resolves.toEqual({ studentProfile });

    expect(mocks.upsertProfile).toHaveBeenCalledWith(STUDENT_A.id, {
      displayName: "Student A",
      timezone: undefined,
    });
    expect(mocks.upsertStudentProfile).toHaveBeenCalledWith(STUDENT_A.id, {
      ageBand: "16–17",
      district: "Warwick",
      educationLevel: undefined,
      interests: ["Technology"],
      routesOfInterest: ["Apprenticeship"],
      goals: undefined,
      accessibilityNeeds: undefined,
      onboardingCompleted: true,
    });
  });
});
