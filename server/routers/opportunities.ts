import { z } from "zod";
import { publicProcedure, router, studentProcedure } from "../_core/trpc";
import {
  getPublishedOpportunity,
  getRelatedPublishedOpportunities,
  isOpportunitySaved,
  listPublishedOpportunities,
  listSavedOpportunities,
  saveOpportunity,
  unsaveOpportunity,
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_ROUTES,
  WARWICKSHIRE_DISTRICTS,
} from "../db/opportunities";

const opportunityType = z.enum(["apprenticeship", "internship", "traineeship", "part_time", "full_time", "volunteering", "work_experience"]);
const listInput = z.object({
  search: z.string().trim().max(120).optional(),
  district: z.enum(WARWICKSHIRE_DISTRICTS).optional(),
  type: opportunityType.optional(),
  category: z.string().trim().max(64).optional(),
  minAge: z.number().int().min(13).max(100).optional(),
  maxAge: z.number().int().min(13).max(100).optional(),
  route: z.enum(OPPORTUNITY_ROUTES).optional(),
  deliveryMethod: z.string().trim().max(32).optional(),
  remoteEligible: z.boolean().optional(),
  closingBefore: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
  sort: z.enum(["closing_soonest", "newest", "title"]).default("closing_soonest"),
});

export const opportunitiesRouter = router({
  list: publicProcedure.input(listInput.optional()).query(({ input }) => listPublishedOpportunities(input ?? {})),
  getById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(({ input }) => getPublishedOpportunity(input.id)),
  filters: publicProcedure.query(() => ({ districts: [...WARWICKSHIRE_DISTRICTS], routes: [...OPPORTUNITY_ROUTES], categories: [...OPPORTUNITY_CATEGORIES], types: opportunityType.options })),
  related: publicProcedure.input(z.object({ id: z.string().uuid() })).query(({ input }) => getRelatedPublishedOpportunities(input.id)),
  savedList: studentProcedure.query(({ ctx }) => listSavedOpportunities(ctx.user.id)),
  save: studentProcedure.input(z.object({ opportunityId: z.string().uuid() })).mutation(({ ctx, input }) => saveOpportunity(ctx.user.id, input.opportunityId)),
  unsave: studentProcedure.input(z.object({ opportunityId: z.string().uuid() })).mutation(({ ctx, input }) => unsaveOpportunity(ctx.user.id, input.opportunityId)),
  isSaved: studentProcedure.input(z.object({ opportunityId: z.string().uuid() })).query(({ ctx, input }) => isOpportunitySaved(ctx.user.id, input.opportunityId)),
});

export type OpportunitiesRouter = typeof opportunitiesRouter;
