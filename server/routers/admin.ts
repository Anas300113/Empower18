import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  createDraft,
  createOrganisation,
  createSource,
  getAdminDashboard,
  getAdminOpportunity,
  listAdminOpportunities,
  listAuditLogs,
  listOrganisations,
  listSources,
  transitionOpportunity,
  updateDraft,
  updateOrganisation,
  updateSource,
  WARWICKSHIRE_DISTRICTS,
} from "../db/opportunities";

const opportunityType = z.enum(["apprenticeship", "internship", "traineeship", "part_time", "full_time", "volunteering", "work_experience"]);
const status = z.enum(["draft", "pending_review", "published", "paused", "closed", "expired"]);
const sourceType = z.enum(["api", "rss", "web_scrape", "manual", "email_parse"]);
const reliabilityStatus = z.enum(["unknown", "healthy", "degraded", "unhealthy"]);
const organisationType = z.enum(["employer", "training_provider", "college", "university", "charity", "government", "agency", "other"]);

const dateField = z.coerce.date().nullable().optional();
const opportunityFields = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(30000),
  summary: z.string().trim().max(1000).nullable().optional(),
  type: opportunityType,
  category: z.string().trim().max(64).nullable().optional(),
  route: z.string().trim().max(64).nullable().optional(),
  location: z.string().trim().max(255).nullable().optional(),
  district: z.string().trim().max(64).nullable().optional(),
  deliveryMethod: z.string().trim().max(32).nullable().optional(),
  isRemoteEligible: z.boolean().default(false),
  minAge: z.number().int().min(13).max(100).nullable().optional(),
  maxAge: z.number().int().min(13).max(100).nullable().optional(),
  educationRequirements: z.string().trim().max(5000).nullable().optional(),
  qualificationRequirements: z.string().trim().max(5000).nullable().optional(),
  requiredSkills: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  salaryMin: z.string().trim().max(32).nullable().optional(),
  salaryMax: z.string().trim().max(32).nullable().optional(),
  compensationText: z.string().trim().max(1000).nullable().optional(),
  applicationOpensAt: dateField,
  applicationDeadlineAt: dateField,
  startDateAt: dateField,
  expiresAt: dateField,
  externalApplicationUrl: z.string().url().max(1024).nullable().optional(),
  applicationInstructions: z.string().trim().max(5000).nullable().optional(),
  sourceId: z.string().uuid().nullable().optional(),
  sourceRecordId: z.string().trim().max(255).nullable().optional(),
  canonicalUrl: z.string().url().max(1024).nullable().optional(),
  verificationEvidence: z.string().trim().max(10000).nullable().optional(),
  nextReviewAt: dateField,
  organisationId: z.string().uuid().nullable().optional(),
});

function toDbInput(input: z.infer<typeof opportunityFields>) {
  const { organisationId, ...values } = input;
  return { values, organisationId };
}

function assertPublishable(opportunity: any) {
  const failures: string[] = [];
  if (!opportunity.title?.trim() || !opportunity.description?.trim()) failures.push("title and description");
  if (!opportunity.type) failures.push("opportunity type");
  if ((!opportunity.district || !WARWICKSHIRE_DISTRICTS.includes(opportunity.district as (typeof WARWICKSHIRE_DISTRICTS)[number])) && !opportunity.isRemoteEligible) failures.push("recognised district or remote delivery");
  if (!opportunity.sourceId || !opportunity.canonicalUrl) failures.push("official source and canonical URL");
  if (!opportunity.sourceActive) failures.push("active source record");
  if (!opportunity.verificationEvidence) failures.push("verification evidence");
  if (!opportunity.applicationDeadlineAt && !opportunity.expiresAt) failures.push("deadline or rolling expiry");
  if (!opportunity.nextReviewAt) failures.push("next review date");
  if (opportunity.sourceReliability === "unhealthy") failures.push("healthy source");
  if (failures.length) throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot publish until these requirements are met: ${failures.join(", " )}` });
}

export const adminRouter = router({
  dashboard: adminProcedure.query(() => getAdminDashboard()),
  opportunities: router({
    list: adminProcedure.input(z.object({ status: status.optional(), search: z.string().trim().max(120).optional(), page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(25) }).optional()).query(({ input }) => listAdminOpportunities(input ?? {})),
    createDraft: adminProcedure.input(opportunityFields).mutation(({ ctx, input }) => { const { values, organisationId } = toDbInput(input); return createDraft(ctx.user.id, values as any, organisationId); }),
    updateDraft: adminProcedure.input(z.object({ id: z.string().uuid(), changes: opportunityFields.partial() })).mutation(({ ctx, input }) => { const { values, organisationId } = toDbInput(input.changes as z.infer<typeof opportunityFields>); return updateDraft(ctx.user.id, input.id, values as any, organisationId); }),
    submitForReview: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ ctx, input }) => transitionOpportunity(ctx.user.id, input.id, "pending_review")),
    approveAndPublish: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => { const opportunity = await getAdminOpportunity(input.id); if (!opportunity) throw new TRPCError({ code: "NOT_FOUND", message: "Opportunity not found" }); assertPublishable(opportunity); return transitionOpportunity(ctx.user.id, input.id, "published", { verificationEvidence: opportunity.verificationEvidence }); }),
    returnForChanges: adminProcedure.input(z.object({ id: z.string().uuid(), reason: z.string().trim().min(1).max(2000) })).mutation(({ ctx, input }) => transitionOpportunity(ctx.user.id, input.id, "draft", { reason: input.reason })),
    pause: adminProcedure.input(z.object({ id: z.string().uuid(), reason: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) => transitionOpportunity(ctx.user.id, input.id, "paused", { reason: input.reason })),
    close: adminProcedure.input(z.object({ id: z.string().uuid(), reason: z.string().trim().min(1).max(2000) })).mutation(({ ctx, input }) => transitionOpportunity(ctx.user.id, input.id, "closed", { reason: input.reason })),
    expireDue: adminProcedure.mutation(async ({ ctx }) => { const opportunity = await listAdminOpportunities({ status: "published", page: 1, pageSize: 100 }); const due = opportunity.filter((item: any) => item.applicationDeadlineAt && new Date(item.applicationDeadlineAt) < new Date()); return Promise.all(due.map((item: any) => transitionOpportunity(ctx.user.id, item.id, "expired", { reason: "Application deadline passed" }))); }),
  }),
  sources: router({
    list: adminProcedure.query(() => listSources()),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(1).max(255), organisation: z.string().trim().max(255).nullable().optional(), type: sourceType, officialUrl: z.string().url().nullable().optional(), apiEndpoint: z.string().url().nullable().optional(), authRequired: z.boolean().default(false), permittedUse: z.string().trim().max(5000).nullable().optional(), termsOfServiceUrl: z.string().url().nullable().optional(), retrievalSchedule: z.string().trim().max(64).nullable().optional(), rateLimit: z.string().trim().max(64).nullable().optional(), sourceAuthority: z.string().trim().max(64).nullable().optional(), administratorOwner: z.string().trim().max(255).nullable().optional(), reliabilityStatus: reliabilityStatus.default("unknown"), isActive: z.boolean().default(true) })).mutation(({ ctx, input }) => createSource(ctx.user.id, input as any)),
    update: adminProcedure.input(z.object({ id: z.string().uuid(), changes: z.record(z.string(), z.unknown()) })).mutation(({ ctx, input }) => updateSource(ctx.user.id, input.id, input.changes as any)),
  }),
  organisations: router({
    list: adminProcedure.query(() => listOrganisations()),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(1).max(255), type: organisationType.nullable().optional(), website: z.string().url().nullable().optional(), description: z.string().trim().max(5000).nullable().optional(), location: z.string().trim().max(255).nullable().optional(), isVerified: z.boolean().default(false) })).mutation(({ ctx, input }) => createOrganisation(ctx.user.id, input as any)),
    update: adminProcedure.input(z.object({ id: z.string().uuid(), changes: z.record(z.string(), z.unknown()) })).mutation(({ ctx, input }) => updateOrganisation(ctx.user.id, input.id, input.changes as any)),
  }),
  audit: router({ list: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(200).default(100) }).optional()).query(({ input }) => listAuditLogs(input?.limit ?? 100)) }),
});

export type AdminRouter = typeof adminRouter;
