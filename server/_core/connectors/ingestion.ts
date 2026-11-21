import { and, eq, notInArray } from "drizzle-orm";
import {
  opportunities,
  opportunitySources,
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
    resolveConnectorConfig(connectorId)
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
          const inserted = await tx
            .insert(opportunities)
            .values(values)
            .onConflictDoNothing({
              target: [opportunities.sourceId, opportunities.sourceRecordId],
            })
            .returning({ id: opportunities.id });
          if (inserted.length === 1) {
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
            })
            .where(
              and(
                eq(opportunities.sourceId, source.id),
                eq(opportunities.sourceRecordId, item.sourceRecordId)
              )
            );
          updatedCount += 1;
        }
      });

      if (!page.hasMore || !page.nextCursor) break;
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
