import { z } from "zod";
import {
  publicProcedure,
  studentProcedure,
  router,
} from "../_core/trpc";
import {
  getFullProfile,
  upsertProfile,
  upsertStudentProfile,
  ensureStudentRole,
} from "../db/profile";

export const profileRouter = router({
  /**
   * Get the current user's full profile (profile + student profile + roles).
   */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return { profile: null, studentProfile: null, roles: [] };
    }

    // Ensure the student role exists for authenticated users.
    await ensureStudentRole(ctx.user.id);

    return getFullProfile(ctx.user.id);
  }),

  /**
   * Update the current user's core profile.
   */
  update: studentProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(120).optional().nullable(),
        timezone: z.string().min(1).max(64).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error("User not authenticated");
      }
      const profile = await upsertProfile(userId, {
        displayName: input.displayName,
        timezone: input.timezone,
      });
      return { profile };
    }),

  /**
   * Submit onboarding data (student profile).
   * Can be called multiple times; data is merged/upserted.
   */
  onboarding: studentProcedure
    .input(
      z.object({
        ageBand: z.string().max(16).optional().nullable(),
        district: z.string().max(64).optional().nullable(),
        educationLevel: z.string().max(64).optional().nullable(),
        interests: z.array(z.string()).optional(),
        routesOfInterest: z.array(z.string()).optional(),
        goals: z.string().optional().nullable(),
        accessibilityNeeds: z.string().optional().nullable(),
        onboardingCompleted: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error("User not authenticated");
      }
      const studentProfile = await upsertStudentProfile(userId, {
        ageBand: input.ageBand,
        district: input.district,
        educationLevel: input.educationLevel,
        interests: input.interests,
        routesOfInterest: input.routesOfInterest,
        goals: input.goals,
        accessibilityNeeds: input.accessibilityNeeds,
        onboardingCompleted: input.onboardingCompleted,
      });
      return { studentProfile };
    }),
});

export type ProfileRouter = typeof profileRouter;
