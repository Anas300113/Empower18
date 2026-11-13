import { eq } from "drizzle-orm";
import {
  profiles,
  studentProfiles,
  userRoles,
  type Profile,
  type StudentProfile,
} from "../../drizzle/schema";
import { getDb } from "./index";

/**
 * Get a profile by Supabase Auth user ID.
 */
export async function getProfileByUserId(
  userId: string
): Promise<Profile | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Create or update a profile for a user.
 */
export async function upsertProfile(
  userId: string,
  data: {
    displayName?: string | null;
    timezone?: string | null;
  }
): Promise<Profile> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const existing = await getProfileByUserId(userId);

  if (existing) {
    const [updated] = await db
      .update(profiles)
      .set({
        ...(data.displayName !== undefined
          ? { displayName: data.displayName }
          : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(profiles)
    .values({
      userId,
      displayName: data.displayName ?? null,
      timezone: data.timezone ?? "Europe/London",
    })
    .returning();
  return created;
}

/**
 * Get a student profile by Supabase Auth user ID.
 */
export async function getStudentProfileByUserId(
  userId: string
): Promise<StudentProfile | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Create or update a student profile (onboarding data).
 */
export async function upsertStudentProfile(
  userId: string,
  data: {
    ageBand?: string | null;
    district?: string | null;
    educationLevel?: string | null;
    interests?: string[];
    routesOfInterest?: string[];
    goals?: string | null;
    accessibilityNeeds?: string | null;
    onboardingCompleted?: boolean;
  }
): Promise<StudentProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const existing = await getStudentProfileByUserId(userId);

  if (existing) {
    const [updated] = await db
      .update(studentProfiles)
      .set({
        ...(data.ageBand !== undefined ? { ageBand: data.ageBand } : {}),
        ...(data.district !== undefined ? { district: data.district } : {}),
        ...(data.educationLevel !== undefined
          ? { educationLevel: data.educationLevel }
          : {}),
        ...(data.interests !== undefined ? { interests: data.interests } : {}),
        ...(
          data.routesOfInterest !== undefined
            ? { routesOfInterest: data.routesOfInterest }
            : {}
        ),
        ...(data.goals !== undefined ? { goals: data.goals } : {}),
        ...(
          data.accessibilityNeeds !== undefined
            ? { accessibilityNeeds: data.accessibilityNeeds }
            : {}
        ),
        ...(
          data.onboardingCompleted !== undefined
            ? { onboardingCompleted: data.onboardingCompleted }
            : {}
        ),
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.userId, userId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(studentProfiles)
    .values({
      userId,
      ageBand: data.ageBand ?? null,
      district: data.district ?? null,
      educationLevel: data.educationLevel ?? null,
      interests: data.interests ?? [],
      routesOfInterest: data.routesOfInterest ?? [],
      goals: data.goals ?? null,
      accessibilityNeeds: data.accessibilityNeeds ?? null,
      onboardingCompleted: data.onboardingCompleted ?? false,
    })
    .returning();
  return created;
}

/**
 * Get all roles for a user.
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  return result.map((r) => r.role);
}

/**
 * Ensure a user has the 'student' role (called on first login).
 */
export async function ensureStudentRole(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getUserRoles(userId);
  if (existing.includes("student")) return;

  await db.insert(userRoles).values({
    userId,
    role: "student",
  });
}

/**
 * Get the combined profile + student profile for a user.
 */
export async function getFullProfile(userId: string) {
  const [profile, studentProfile, roles] = await Promise.all([
    getProfileByUserId(userId),
    getStudentProfileByUserId(userId),
    getUserRoles(userId),
  ]);

  return {
    profile,
    studentProfile,
    roles,
  };
}
