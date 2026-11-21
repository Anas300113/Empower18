import { and, eq, ilike, notInArray } from "drizzle-orm";
import {
  opportunities,
  opportunityOrganisations,
  opportunitySources,
  organisations,
  type Opportunity,
  type OpportunitySource,
} from "../../../drizzle/schema";
import type { CanonicalOpportunity, SyncResult, SyncOptions } from "./base";
import { createConnector, resolveConnectorConfig } from "./registry";
import { getDb } from "../../db";

const DEFAULT_MAX_PAGES = 100;
const DEFAULT_PAGE_SIZE = 50;

function toOpportunityValues(
  sourceId: string,
  item: CanonicalOpportunity,
  now: Date
) {
  return {
    title: item.title,
    description: item.description,
    summary: item.summary ?? null,
    type: item.type as Opportunity["type"],
    category: item.category ?? null,
    route: item.route ?? null,
    status: "draft" as const,
    location: item.location ?? null,
    district: item.district ?? null,
    deliveryMethod: item.deliveryMethod ?? null,
    isRemoteEligible: item.isRemoteEligible ?? false,
    minAge: item.minAge ?? null,
    maxAge: item.maxAge ?? null,
    educationRequirements: item.educationRequirements ?? null,
    qualificationRequirements: item.qualificationRequirements ?? null,
    requiredSkills: item.requiredSkills ?? [],
    salaryMin: item.salaryMin?.toString() ?? null,
    salaryMax: item.salaryMax?.toString() ?? null,
    compensationText: item.compensationText ?? null,
    applicationOpensAt: item.applicationOpensAt ?? null,
    applicationDeadlineAt: item.applicationDeadlineAt ?? null,
    startDateAt: item.startDateAt ?? null,
    expiresAt: item.expiresAt ?? null,
    externalApplicationUrl: item.externalApplicationUrl ?? null,
    applicationInstructions: item.applicationInstructions ?? null,
    sourceId,
    sourceRecordId: item.sourceRecordId,
    canonicalUrl: item.canonicalUrl,
    isPublished: false,
    verifiedBy: null,
    verifiedAt: null,
    publishedAt: null,
    updatedAt: now,
  };
}

function materiallyChanged(
  existing: Record<string, unknown>,
  values: ReturnType<typeof toOpportunityValues>
) {
  const fields = [
    "title",
    "description",
    "summary",
    "type",
    "category",
    "route",
    "location",
    "district",
    "deliveryMethod",
    "isRemoteEligible",
    "minAge",
    "maxAge",
    "educationRequirements",
    "qualificationRequirements",
    "requiredSkills",
    "salaryMin",
    "salaryMax",
    "compensationText",
    "applicationOpensAt",
    "applicationDeadlineAt",
    "startDateAt",
    "expiresAt",
    "externalApplicationUrl",
    "applicationInstructions",
    "canonicalUrl",
  ] as const;
  return fields.some(field => {
    const before = existing[field];
    const after = values[field];
    if (before instanceof Date && after instanceof Date)
      return before.getTime() !== after.getTime();
    return JSON.stringify(before) !== JSON.stringify(after);
  });
}

/**
 * Synchronise one configured source. Imported records are always unpublished
 * drafts; a successful full traversal is required before missing records are
 * closed, preventing partial provider outages from removing listings.
 */
export async function syncOpportunitySource(
  source: OpportunitySource,
  connectorId: string,
  options: { maxPages?: number; pageSize?: number } = {}
): Promise<SyncResult> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const startedAt = new Date();
  const errors: SyncResult["errors"] = [];
  const warnings: SyncResult["warnings"] = [];
  const seenRecordIds = new Set<string>();
  let fetchedCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let cursor: string | null | undefined = null;
  let pages = 0;

  const connector = createConnector(
    connectorId,
    resolveConnectorConfig(
      connectorId,
      (source.connectorConfig ?? {}) as Record<string, string>
    )
  );
  if (!connector) {
    throw new Error(`No connector registered for source ${source.id}`);
  }

  try {
    const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const syncOptions: SyncOptions = {
      sourceId: source.id,
      pageSize,
      maxPages,
    };

    while (pages < maxPages) {
      const page = await connector.fetchOpportunities({
        ...syncOptions,
        cursor,
      });
      pages += 1;
      fetchedCount += page.items.length;

      await db.transaction(async tx => {
        for (const item of page.items) {
          if (seenRecordIds.has(item.sourceRecordId)) {
            skippedCount += 1;
            continue;
          }
          seenRecordIds.add(item.sourceRecordId);
          const values = toOpportunityValues(source.id, item, new Date());
          const [existing] = await tx
            .select()
            .from(opportunities)
            .where(
              and(
                eq(opportunities.sourceId, source.id),
                eq(opportunities.sourceRecordId, item.sourceRecordId)
              )
            )
            .limit(1);
          const inserted = await tx
            .insert(opportunities)
            .values(values)
            .onConflictDoNothing({
              target: [opportunities.sourceId, opportunities.sourceRecordId],
            })
            .returning({ id: opportunities.id });
          if (inserted.length === 1) {
            if (item.organisationName) {
              const [organisation] = await tx
                .select()
                .from(organisations)
                .where(ilike(organisations.name, item.organisationName))
                .limit(1);
              const [createdOrganisation] = organisation
                ? [organisation]
                : await tx
                    .insert(organisations)
                    .values({
                      name: item.organisationName,
                      website: item.organisationWebsite ?? null,
                      type: "employer",
                    })
                    .returning();
              await tx.insert(opportunityOrganisations).values({
                opportunityId: inserted[0].id,
                organisationId: createdOrganisation.id,
                role: "employer",
              });
            }
            insertedCount += 1;
            continue;
          }
          await tx
            .update(opportunities)
            .set({
              title: values.title,
              description: values.description,
              summary: values.summary,
              type: values.type,
              category: values.category,
              route: values.route,
              location: values.location,
              district: values.district,
              deliveryMethod: values.deliveryMethod,
              isRemoteEligible: values.isRemoteEligible,
              minAge: values.minAge,
              maxAge: values.maxAge,
              educationRequirements: values.educationRequirements,
              qualificationRequirements: values.qualificationRequirements,
              requiredSkills: values.requiredSkills,
              salaryMin: values.salaryMin,
              salaryMax: values.salaryMax,
              compensationText: values.compensationText,
              applicationOpensAt: values.applicationOpensAt,
              applicationDeadlineAt: values.applicationDeadlineAt,
              startDateAt: values.startDateAt,
              expiresAt: values.expiresAt,
              externalApplicationUrl: values.externalApplicationUrl,
              applicationInstructions: values.applicationInstructions,
              canonicalUrl: values.canonicalUrl,
              updatedAt: values.updatedAt,
              ...(existing && materiallyChanged(existing, values)
                ? {
                    status: "pending_review" as const,
                    isPublished: false,
                    verifiedBy: null,
                    verifiedAt: null,
                    verificationEvidence: null,
                    nextReviewAt: null,
                  }
                : {}),
              ...(existing && ["closed", "paused"].includes(existing.status)
                ? {
                    status: "pending_review" as const,
                    isPublished: false,
                  }
                : {}),
            })
            .where(
              and(
                eq(opportunities.sourceId, source.id),
                eq(opportunities.sourceRecordId, item.sourceRecordId)
              )
            );
          updatedCount += 1;
          if (existing && item.organisationName) {
            const [organisation] = await tx
              .select()
              .from(organisations)
              .where(ilike(organisations.name, item.organisationName))
              .limit(1);
            if (organisation) {
              await tx
                .delete(opportunityOrganisations)
                .where(eq(opportunityOrganisations.opportunityId, existing.id));
              await tx.insert(opportunityOrganisations).values({
                opportunityId: existing.id,
                organisationId: organisation.id,
                role: "employer",
              });
            }
          }
        }
      });

      if (!page.hasMore || !page.nextCursor) {
        cursor = null;
        break;
      }
      cursor = page.nextCursor;
    }

    if (pages >= maxPages && cursor) {
      throw new Error(`Sync exceeded maximum page limit (${maxPages})`);
    }

    const now = new Date();
    await db.transaction(async tx => {
      if (seenRecordIds.size > 0) {
        await tx
          .update(opportunities)
          .set({ status: "closed", isPublished: false, updatedAt: now })
          .where(
            and(
              eq(opportunities.sourceId, source.id),
              notInArray(opportunities.sourceRecordId, [...seenRecordIds])
            )
          );
      }
      await tx
        .update(opportunitySources)
        .set({
          lastSuccessfulSync: now,
          reliabilityStatus: "healthy",
          updatedAt: now,
        })
        .where(eq(opportunitySources.id, source.id));
    });

    const completedAt = new Date();
    return {
      sourceId: source.id,
      sourceName: source.name,
      startedAt,
      completedAt,
      status: "success",
      fetchedCount,
      insertedCount,
      updatedCount,
      skippedCount,
      errorCount: errors.length,
      errors,
      warnings,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync error";
    errors.push({ message, fatal: true });
    await db
      .update(opportunitySources)
      .set({
        lastFailedSync: new Date(),
        reliabilityStatus: "degraded",
        updatedAt: new Date(),
      })
      .where(eq(opportunitySources.id, source.id));
    return {
      sourceId: source.id,
      sourceName: source.name,
      startedAt,
      completedAt: new Date(),
      status: "failed",
      fetchedCount,
      insertedCount,
      updatedCount,
      skippedCount,
      errorCount: errors.length,
      errors,
      warnings,
    };
  }
}

export async function syncActiveOpportunitySources(options?: {
  sourceId?: string;
  maxPages?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const sources = await db
    .select()
    .from(opportunitySources)
    .where(eq(opportunitySources.isActive, true));
  const selected = options?.sourceId
    ? sources.filter(source => source.id === options.sourceId)
    : sources;
  if (options?.sourceId && selected.length === 0)
    throw new Error("Active opportunity source not found");

  const results = [];
  for (const source of selected) {
    if (!source.connectorId) {
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        status: "failed" as const,
        error: "Source has no connectorId configured",
      });
      continue;
    }
    results.push(
      await syncOpportunitySource(source, source.connectorId, options)
    );
  }
  return results;
}
