import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, studentProcedure } from "../_core/trpc";
import {
  APPLICATION_STAGES,
  createApplication,
  createApplicationTask,
  listApplications,
  listApplicationTasks,
  setApplicationTaskComplete,
  updateApplicationNotes,
  updateApplicationStage,
} from "../db/applications";

const applicationIdInput = z.object({ applicationId: z.string().uuid() });

function databaseError(error: unknown): never {
  if (error instanceof Error && error.message === "Application not found") {
    throw new TRPCError({ code: "NOT_FOUND", message: error.message });
  }
  if (error instanceof Error && error.message.includes("no longer available")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  throw error;
}

export const applicationsRouter = router({
  list: studentProcedure.query(({ ctx }) => listApplications(ctx.user.id)),
  create: studentProcedure
    .input(z.object({ opportunityId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      createApplication(ctx.user.id, input.opportunityId).catch(databaseError)
    ),
  updateStage: studentProcedure
    .input(
      applicationIdInput.extend({
        stage: z.enum(APPLICATION_STAGES),
        reason: z.string().trim().max(2000).optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      updateApplicationStage(
        ctx.user.id,
        input.applicationId,
        input.stage,
        input.reason
      ).catch(databaseError)
    ),
  updateNotes: studentProcedure
    .input(
      applicationIdInput.extend({
        notes: z.string().trim().max(5000).nullable(),
      })
    )
    .mutation(({ ctx, input }) =>
      updateApplicationNotes(
        ctx.user.id,
        input.applicationId,
        input.notes
      ).catch(databaseError)
    ),
  tasks: router({
    list: studentProcedure
      .input(applicationIdInput)
      .query(({ ctx, input }) =>
        listApplicationTasks(ctx.user.id, input.applicationId).catch(
          databaseError
        )
      ),
    create: studentProcedure
      .input(
        applicationIdInput.extend({
          title: z.string().trim().min(1).max(255),
          dueAt: z.coerce.date().nullable().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        createApplicationTask(
          ctx.user.id,
          input.applicationId,
          input.title,
          input.dueAt
        ).catch(databaseError)
      ),
    setComplete: studentProcedure
      .input(
        applicationIdInput.extend({
          taskId: z.string().uuid(),
          isCompleted: z.boolean(),
        })
      )
      .mutation(({ ctx, input }) =>
        setApplicationTaskComplete(
          ctx.user.id,
          input.applicationId,
          input.taskId,
          input.isCompleted
        ).catch(databaseError)
      ),
  }),
});

export type ApplicationsRouter = typeof applicationsRouter;
