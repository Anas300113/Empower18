import { and, asc, desc, eq, exists } from "drizzle-orm";
import {
  applicationEvents,
  applicationTasks,
  opportunities,
  studentApplications,
  type StudentApplication,
} from "../../drizzle/schema";
import { getDb } from "./index";
import { getPublishedOpportunity } from "./opportunities";

export const APPLICATION_STAGES = [
  "interested",
  "started",
  "submitted",
  "under_review",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

async function findOwnedApplication(userId: string, applicationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const [application] = await db
    .select()
    .from(studentApplications)
    .where(
      and(
        eq(studentApplications.id, applicationId),
        eq(studentApplications.userId, userId)
      )
    )
    .limit(1);
  return application ?? null;
}

export async function listApplications(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const rows = await db
    .select()
    .from(studentApplications)
    .innerJoin(
      opportunities,
      eq(opportunities.id, studentApplications.opportunityId)
    )
    .where(eq(studentApplications.userId, userId))
    .orderBy(desc(studentApplications.updatedAt));

  return rows.map(row => ({
    ...row.student_applications,
    opportunity: {
      id: row.opportunities.id,
      title: row.opportunities.title,
      status: row.opportunities.status,
      location: row.opportunities.location,
      applicationDeadlineAt: row.opportunities.applicationDeadlineAt,
      externalApplicationUrl: row.opportunities.externalApplicationUrl,
    },
  }));
}

export async function createApplication(userId: string, opportunityId: string) {
  const visibleOpportunity = await getPublishedOpportunity(opportunityId);
  if (!visibleOpportunity)
    throw new Error("This opportunity is no longer available to track");

  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db.transaction(async tx => {
    const [created] = await tx
      .insert(studentApplications)
      .values({
        userId,
        opportunityId,
        stage: "interested",
      })
      .onConflictDoNothing({
        target: [studentApplications.userId, studentApplications.opportunityId],
      })
      .returning();
    if (!created) {
      const [existing] = await tx
        .select()
        .from(studentApplications)
        .where(
          and(
            eq(studentApplications.userId, userId),
            eq(studentApplications.opportunityId, opportunityId)
          )
        )
        .limit(1);
      if (existing) return existing;
      throw new Error("Unable to create application tracker entry");
    }
    await tx.insert(applicationEvents).values({
      applicationId: created.id,
      stage: "interested",
      changedBy: userId,
      reason: "Added to application tracker",
    });
    return created;
  });
}

export async function updateApplicationStage(
  userId: string,
  applicationId: string,
  stage: ApplicationStage,
  reason?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db.transaction(async tx => {
    const [before] = await tx
      .select()
      .from(studentApplications)
      .where(
        and(
          eq(studentApplications.id, applicationId),
          eq(studentApplications.userId, userId)
        )
      )
      .limit(1);
    if (!before) throw new Error("Application not found");

    const now = new Date();
    const [updated] = await tx
      .update(studentApplications)
      .set({
        stage,
        isSubmitted: stage === "submitted" ? true : before.isSubmitted,
        submittedAt:
          stage === "submitted" && !before.submittedAt
            ? now
            : before.submittedAt,
        updatedAt: now,
      })
      .where(
        and(
          eq(studentApplications.id, applicationId),
          eq(studentApplications.userId, userId)
        )
      )
      .returning();
    await tx.insert(applicationEvents).values({
      applicationId,
      stage,
      changedBy: userId,
      reason: reason ?? null,
    });
    return updated;
  });
}

export async function updateApplicationNotes(
  userId: string,
  applicationId: string,
  notes: string | null
) {
  const application = await findOwnedApplication(userId, applicationId);
  if (!application) throw new Error("Application not found");

  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [updated] = await db
    .update(studentApplications)
    .set({ notes, updatedAt: new Date() })
    .where(
      and(
        eq(studentApplications.id, applicationId),
        eq(studentApplications.userId, userId)
      )
    )
    .returning();
  return updated;
}

export async function listApplicationTasks(
  userId: string,
  applicationId: string
) {
  const application = await findOwnedApplication(userId, applicationId);
  if (!application) throw new Error("Application not found");

  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(applicationTasks)
    .where(eq(applicationTasks.applicationId, applicationId))
    .orderBy(
      asc(applicationTasks.isCompleted),
      asc(applicationTasks.dueAt),
      asc(applicationTasks.createdAt)
    );
}

export async function listApplicationEvents(
  userId: string,
  applicationId: string
) {
  const application = await findOwnedApplication(userId, applicationId);
  if (!application) throw new Error("Application not found");

  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(applicationEvents)
    .where(eq(applicationEvents.applicationId, applicationId))
    .orderBy(desc(applicationEvents.changedAt));
}

export async function createApplicationTask(
  userId: string,
  applicationId: string,
  title: string,
  dueAt?: Date | null
) {
  const application = await findOwnedApplication(userId, applicationId);
  if (!application) throw new Error("Application not found");

  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [task] = await db
    .insert(applicationTasks)
    .values({ applicationId, title, dueAt: dueAt ?? null })
    .returning();
  return task;
}

export async function setApplicationTaskComplete(
  userId: string,
  applicationId: string,
  taskId: string,
  isCompleted: boolean
) {
  const application = await findOwnedApplication(userId, applicationId);
  if (!application) throw new Error("Application not found");

  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [task] = await db
    .update(applicationTasks)
    .set({
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(applicationTasks.id, taskId),
        eq(applicationTasks.applicationId, applicationId),
        exists(
          db
            .select({ id: studentApplications.id })
            .from(studentApplications)
            .where(
              and(
                eq(studentApplications.id, applicationTasks.applicationId),
                eq(studentApplications.userId, userId)
              )
            )
        )
      )
    )
    .returning();
  if (!task) throw new Error("Task not found");
  return task;
}

export type ApplicationRecord = StudentApplication;
