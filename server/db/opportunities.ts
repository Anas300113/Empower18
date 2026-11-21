import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  gt,
  ilike,
  inArray,
  isNull,
  lte,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import {
  adminAuditLogs,
  opportunities,
  opportunityOrganisations,
  opportunitySources,
  organisations,
  savedOpportunities,
  type InsertOpportunity,
  type InsertOpportunitySource,
  type InsertOrganisation,
  type Opportunity,
  type OpportunitySource,
  type Organisation,
} from "../../drizzle/schema";
import { getDb } from "./index";

const WARWICKSHIRE_DISTRICTS = [
  "North Warwickshire",
  "Nuneaton & Bedworth",
  "Rugby",
  "Warwick",
  "Stratford-on-Avon",
] as const;

export const OPPORTUNITY_ROUTES = [
  "Apprenticeship",
  "University",
  "T Level",
  "Work experience",
  "Employment",
  "Skills & support",
] as const;

export const OPPORTUNITY_CATEGORIES = [
  "Apprenticeship",
  "Work experience",
  "Course",
  "Entry-level job",
  "Event",
  "Support",
] as const;

export type OpportunityListFilters = {
  search?: string;
  district?: string;
  type?: Opportunity["type"];
  category?: string;
  minAge?: number;
  maxAge?: number;
  route?: string;
  deliveryMethod?: string;
  remoteEligible?: boolean;
  closingBefore?: Date;
  page?: number;
  pageSize?: number;
  sort?: "closing_soonest" | "newest" | "title";
};

export class PublicationValidationError extends Error {}

function activePublishedConditions(now = new Date()) {
  return and(
    eq(opportunities.status, "published"),
    eq(opportunities.isPublished, true),
    sql`(${opportunities.expiresAt} IS NULL OR ${opportunities.expiresAt} > ${now})`,
    sql`(${opportunities.applicationDeadlineAt} IS NULL OR ${opportunities.applicationDeadlineAt} >= ${now})`,
    sql`${opportunities.sourceId} IS NOT NULL`,
    sql`${opportunities.canonicalUrl} IS NOT NULL`,
    sql`${opportunities.verifiedBy} IS NOT NULL`,
    sql`${opportunities.verifiedAt} IS NOT NULL`,
    sql`${opportunities.verificationEvidence} IS NOT NULL`,
    sql`${opportunities.nextReviewAt} IS NOT NULL AND ${opportunities.nextReviewAt} >= ${now}`
  );
}

function sourceActiveCondition() {
  return eq(opportunitySources.isActive, true);
}

function listOrder(sort: OpportunityListFilters["sort"]) {
  if (sort === "newest")
    return [
      desc(opportunities.publishedAt),
      desc(opportunities.updatedAt),
    ] as const;
  if (sort === "title")
    return [asc(opportunities.title), asc(opportunities.id)] as const;
  return [
    asc(opportunities.applicationDeadlineAt),
    desc(opportunities.publishedAt),
    asc(opportunities.id),
  ] as const;
}

function mapOpportunity(row: any) {
  return {
    ...row.opportunities,
    organisationName: row.organisations?.name ?? null,
    organisationWebsite: row.organisations?.website ?? null,
    sourceName: row.opportunity_sources?.name ?? null,
    sourceOfficialUrl: row.opportunity_sources?.officialUrl ?? null,
    sourceActive: row.opportunity_sources?.isActive ?? false,
    sourceReliability: row.opportunity_sources?.reliabilityStatus ?? null,
    sourceLastChecked: row.opportunity_sources?.lastSuccessfulSync ?? null,
  };
}

export async function listPublishedOpportunities(
  filters: OpportunityListFilters = {}
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const conditions = [activePublishedConditions(), sourceActiveCondition()];

  if (filters.search) {
    const query = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(opportunities.title, query),
        ilike(opportunities.description, query),
        sql`array_to_string(${opportunities.requiredSkills}, ' ') ILIKE ${query}`
      ) as any
    );
  }
  if (filters.district)
    conditions.push(eq(opportunities.district, filters.district));
  if (filters.type) conditions.push(eq(opportunities.type, filters.type));
  if (filters.category)
    conditions.push(eq(opportunities.category, filters.category));
  if (filters.minAge !== undefined)
    conditions.push(
      or(
        isNull(opportunities.maxAge),
        gte(opportunities.maxAge, filters.minAge)
      ) as any
    );
  if (filters.maxAge !== undefined)
    conditions.push(
      or(
        isNull(opportunities.minAge),
        lte(opportunities.minAge, filters.maxAge)
      ) as any
    );
  if (filters.route) conditions.push(eq(opportunities.route, filters.route));
  if (filters.deliveryMethod)
    conditions.push(eq(opportunities.deliveryMethod, filters.deliveryMethod));
  if (filters.remoteEligible !== undefined)
    conditions.push(eq(opportunities.isRemoteEligible, filters.remoteEligible));
  if (filters.closingBefore)
    conditions.push(
      lte(opportunities.applicationDeadlineAt, filters.closingBefore)
    );

  const where = and(...conditions);
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(opportunities)
      .leftJoin(
        opportunityOrganisations,
        eq(opportunityOrganisations.opportunityId, opportunities.id)
      )
      .leftJoin(
        organisations,
        eq(organisations.id, opportunityOrganisations.organisationId)
      )
      .leftJoin(
        opportunitySources,
        eq(opportunitySources.id, opportunities.sourceId)
      )
      .where(where)
      .orderBy(...listOrder(filters.sort))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: count() })
      .from(opportunities)
      .leftJoin(
        opportunitySources,
        eq(opportunitySources.id, opportunities.sourceId)
      )
      .where(where),
  ]).catch(error => {
    const outer = error as { name?: unknown; cause?: unknown } | null;
    const cause = outer?.cause as
      | { name?: unknown; code?: unknown; message?: unknown; stack?: unknown }
      | undefined;
    const message =
      typeof cause?.message === "string"
        ? cause.message
            .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, "[redacted database URL]")
            .replace(/(password|secret|token|key)([=:])\s*[^\s,;]+/gi, "$1$2[redacted]")
            .replace(/[\r\n\t]+/g, " ")
            .slice(0, 240)
        : undefined;
    const causeStack =
      typeof cause?.stack === "string"
        ? cause.stack
            .split(/\r?\n/)
            .slice(1, 5)
            .map(frame => frame.trim().slice(0, 180))
            .join(" | ")
            .slice(0, 600)
        : undefined;
    console.error("[Database] opportunities.list query failed", {
      errorName: typeof outer?.name === "string" ? outer.name : "Error",
      causeName: typeof cause?.name === "string" ? cause.name : undefined,
      code: typeof cause?.code === "string" ? cause.code : undefined,
      message,
      causeStack,
    });
    throw error;
  });

  return {
    items: rows.map(mapOpportunity),
    total: Number(totals[0]?.count ?? 0),
    page,
    pageSize,
  };
}

export async function getPublishedOpportunity(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select()
    .from(opportunities)
    .leftJoin(
      opportunityOrganisations,
      eq(opportunityOrganisations.opportunityId, opportunities.id)
    )
    .leftJoin(
      organisations,
      eq(organisations.id, opportunityOrganisations.organisationId)
    )
    .leftJoin(
      opportunitySources,
      eq(opportunitySources.id, opportunities.sourceId)
    )
    .where(
      and(
        eq(opportunities.id, id),
        activePublishedConditions(),
        sourceActiveCondition()
      )
    )
    .limit(1);
  return rows[0] ? mapOpportunity(rows[0]) : null;
}

export async function getRelatedPublishedOpportunities(id: string) {
  const current = await getPublishedOpportunity(id);
  if (!current) return [];
  const result = await listPublishedOpportunities({
    page: 1,
    pageSize: 4,
    district: current.district ?? undefined,
    type: current.type,
  });
  return result.items.filter(item => item.id !== id).slice(0, 3);
}

export async function listSavedOpportunities(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const now = new Date();
  const rows = await db
    .select()
    .from(savedOpportunities)
    .innerJoin(
      opportunities,
      eq(opportunities.id, savedOpportunities.opportunityId)
    )
    .leftJoin(
      opportunitySources,
      eq(opportunitySources.id, opportunities.sourceId)
    )
    .where(eq(savedOpportunities.userId, userId))
    .orderBy(desc(savedOpportunities.savedAt));
  return rows.map(row => {
    const opportunity = row.opportunities;
    const source = row.opportunity_sources;
    const availability =
      opportunity.status !== "published" || !opportunity.isPublished
        ? "unavailable"
        : !source?.isActive
          ? "source_inactive"
          : opportunity.expiresAt && opportunity.expiresAt <= now
            ? "expired"
            : opportunity.applicationDeadlineAt &&
                opportunity.applicationDeadlineAt < now
              ? "deadline_passed"
              : opportunity.nextReviewAt && opportunity.nextReviewAt < now
                ? "review_overdue"
                : "available";

    return {
      ...opportunity,
      opportunityId: row.saved_opportunities.opportunityId,
      sourceName: source?.name ?? null,
      savedAt: row.saved_opportunities.savedAt,
      availability,
    };
  });
}

export async function isOpportunitySaved(
  userId: string,
  opportunityId: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select({ id: savedOpportunities.id })
    .from(savedOpportunities)
    .where(
      and(
        eq(savedOpportunities.userId, userId),
        eq(savedOpportunities.opportunityId, opportunityId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

export async function saveOpportunity(userId: string, opportunityId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const visible = await getPublishedOpportunity(opportunityId);
  if (!visible) return false;
  await db
    .insert(savedOpportunities)
    .values({ userId, opportunityId })
    .onConflictDoNothing({
      target: [savedOpportunities.userId, savedOpportunities.opportunityId],
    });
  return true;
}

export async function unsaveOpportunity(userId: string, opportunityId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .delete(savedOpportunities)
    .where(
      and(
        eq(savedOpportunities.userId, userId),
        eq(savedOpportunities.opportunityId, opportunityId)
      )
    );
  return true;
}

export async function listAdminOpportunities(
  filters: {
    status?: Opportunity["status"];
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const conditions = [] as any[];
  if (filters.status) conditions.push(eq(opportunities.status, filters.status));
  if (filters.search)
    conditions.push(
      or(
        ilike(opportunities.title, `%${filters.search}%`),
        ilike(opportunities.description, `%${filters.search}%`)
      )
    );
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const rows = await db
    .select()
    .from(opportunities)
    .leftJoin(
      opportunityOrganisations,
      eq(opportunityOrganisations.opportunityId, opportunities.id)
    )
    .leftJoin(
      organisations,
      eq(organisations.id, opportunityOrganisations.organisationId)
    )
    .leftJoin(
      opportunitySources,
      eq(opportunitySources.id, opportunities.sourceId)
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(opportunities.updatedAt), asc(opportunities.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return rows.map(mapOpportunity);
}

export async function getAdminOpportunity(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select()
    .from(opportunities)
    .leftJoin(
      opportunityOrganisations,
      eq(opportunityOrganisations.opportunityId, opportunities.id)
    )
    .leftJoin(
      organisations,
      eq(organisations.id, opportunityOrganisations.organisationId)
    )
    .leftJoin(
      opportunitySources,
      eq(opportunitySources.id, opportunities.sourceId)
    )
    .where(eq(opportunities.id, id))
    .limit(1);
  return rows[0] ? mapOpportunity(rows[0]) : null;
}

export async function getAdminDashboard() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const now = new Date();
  const grouped = await db
    .select({ status: opportunities.status, count: count() })
    .from(opportunities)
    .groupBy(opportunities.status);
  const counts = Object.fromEntries(
    grouped.map(item => [item.status, Number(item.count)])
  );
  const overdue = await db
    .select({ count: count() })
    .from(opportunities)
    .where(
      and(
        eq(opportunities.status, "published"),
        lt(opportunities.nextReviewAt, now)
      )
    );
  return {
    drafts: counts.draft ?? 0,
    pendingReview: counts.pending_review ?? 0,
    published: counts.published ?? 0,
    paused: counts.paused ?? 0,
    expired: counts.expired ?? 0,
    closed: counts.closed ?? 0,
    overdue: Number(overdue[0]?.count ?? 0),
  };
}

export async function writeAudit(
  tx: any,
  actorUserId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> = {}
) {
  await tx
    .insert(adminAuditLogs)
    .values({ actorUserId, action, targetType, targetId, details });
}

export async function createDraft(
  actorUserId: string,
  input: InsertOpportunity,
  organisationId?: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const [created] = await tx
      .insert(opportunities)
      .values({
        ...input,
        status: "draft",
        isPublished: false,
        verifiedBy: null,
        verifiedAt: null,
        publishedAt: null,
      })
      .returning();
    if (organisationId)
      await tx
        .insert(opportunityOrganisations)
        .values({ opportunityId: created.id, organisationId });
    await writeAudit(
      tx,
      actorUserId,
      "opportunity.created",
      "opportunity",
      created.id,
      { status: "draft" }
    );
    return created;
  });
}

export async function updateDraft(
  actorUserId: string,
  id: string,
  input: Partial<InsertOpportunity>,
  organisationId?: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const [before] = await tx
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, id))
      .limit(1);
    if (!before) throw new Error("Opportunity not found");
    if (!["draft", "pending_review", "paused"].includes(before.status))
      throw new Error(
        "Only draft, review or paused opportunities can be edited"
      );
    const [updated] = await tx
      .update(opportunities)
      .set({
        ...input,
        updatedAt: new Date(),
        status: before.status === "pending_review" ? "draft" : before.status,
      })
      .where(eq(opportunities.id, id))
      .returning();
    if (organisationId !== undefined) {
      await tx
        .delete(opportunityOrganisations)
        .where(eq(opportunityOrganisations.opportunityId, id));
      if (organisationId)
        await tx
          .insert(opportunityOrganisations)
          .values({ opportunityId: id, organisationId });
    }
    await writeAudit(
      tx,
      actorUserId,
      "opportunity.updated",
      "opportunity",
      id,
      { before, after: updated }
    );
    return updated;
  });
}

export async function transitionOpportunity(
  actorUserId: string,
  id: string,
  to: Opportunity["status"],
  details: Record<string, unknown> = {}
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const [before] = await tx
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, id))
      .limit(1);
    if (!before) throw new Error("Opportunity not found");
    const allowed: Record<Opportunity["status"], Opportunity["status"][]> = {
      draft: ["pending_review", "closed"],
      pending_review: ["draft", "published", "closed"],
      published: ["paused", "closed", "expired"],
      paused: ["published", "closed"],
      closed: [],
      expired: [],
    };
    if (!allowed[before.status].includes(to))
      throw new Error(
        `Invalid opportunity transition: ${before.status} -> ${to}`
      );
    if (to === "published") {
      if (!before.sourceId) {
        throw new PublicationValidationError("Cannot publish without an active source record");
      }
      const [source] = await tx
        .select()
        .from(opportunitySources)
        .where(eq(opportunitySources.id, before.sourceId))
        .for("update");
      if (!source?.isActive || source.reliabilityStatus === "unhealthy") {
        throw new PublicationValidationError("Cannot publish unless the source is active and healthy");
      }
      if (!before.canonicalUrl || !before.verificationEvidence || !before.nextReviewAt || (!before.applicationDeadlineAt && !before.expiresAt)) {
        throw new PublicationValidationError("Cannot publish without required verification, review and expiry information");
      }
    }
    const [updated] = await tx
      .update(opportunities)
      .set({
        status: to,
        isPublished: to === "published",
        updatedAt: new Date(),
        ...(to === "published"
          ? {
              publishedAt: new Date(),
              verifiedBy: actorUserId,
              verifiedAt: new Date(),
            }
          : {}),
      })
      .where(eq(opportunities.id, id))
      .returning();
    await writeAudit(tx, actorUserId, `opportunity.${to}`, "opportunity", id, {
      before,
      after: updated,
      ...details,
    });
    return updated;
  });
}

/**
 * Expire every published listing whose application deadline or explicit expiry
 * date has passed. Rows are fetched in database-side batches so a catalogue
 * larger than one page is fully covered without loading it all into memory.
 */
export async function expireDueOpportunities(
  actorUserId: string,
  now = new Date(),
  batchSize = 100
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const expired: Opportunity[] = [];
  while (true) {
    const due = await db
      .select({
        id: opportunities.id,
        applicationDeadlineAt: opportunities.applicationDeadlineAt,
      })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.status, "published"),
          eq(opportunities.isPublished, true),
          or(
            lt(opportunities.applicationDeadlineAt, now),
            lte(opportunities.expiresAt, now)
          )
        )
      )
      .orderBy(
        asc(opportunities.applicationDeadlineAt),
        asc(opportunities.expiresAt),
        asc(opportunities.id)
      )
      .limit(batchSize);
    if (due.length === 0) return expired;

    for (const item of due) {
      expired.push(
        await transitionOpportunity(actorUserId, item.id, "expired", {
          reason:
            item.applicationDeadlineAt && item.applicationDeadlineAt < now
              ? "Application deadline passed"
              : "Listing expiry date passed",
        })
      );
    }
  }
}

export async function listSources() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(opportunitySources)
    .orderBy(asc(opportunitySources.name));
}
export async function createSource(
  actorUserId: string,
  input: InsertOpportunitySource
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const [created] = await tx
      .insert(opportunitySources)
      .values(input)
      .returning();
    await writeAudit(
      tx,
      actorUserId,
      "source.created",
      "opportunity_source",
      created.id
    );
    return created;
  });
}
export async function updateSource(
  actorUserId: string,
  id: string,
  input: Partial<InsertOpportunitySource>
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db.transaction(async tx => {
    const [before] = await tx
      .select()
      .from(opportunitySources)
      .where(eq(opportunitySources.id, id))
      .limit(1);
    if (!before) throw new Error("Source not found");

    const now = new Date();
    const [updated] = await tx
      .update(opportunitySources)
      .set({ ...input, updatedAt: now })
      .where(eq(opportunitySources.id, id))
      .returning();

    const paused =
      input.isActive === false && before.isActive
        ? await tx
            .update(opportunities)
            .set({ status: "paused", isPublished: false, updatedAt: now })
            .where(
              and(
                eq(opportunities.sourceId, id),
                eq(opportunities.status, "published")
              )
            )
            .returning({ id: opportunities.id })
        : [];

    for (const opportunity of paused) {
      await writeAudit(
        tx,
        actorUserId,
        "opportunity.paused",
        "opportunity",
        opportunity.id,
        {
          reason: "Source deactivated",
          sourceId: id,
        }
      );
    }

    await writeAudit(
      tx,
      actorUserId,
      "source.updated",
      "opportunity_source",
      id,
      {
        before,
        after: updated,
        pausedOpportunityIds: paused.map(opportunity => opportunity.id),
      }
    );
    return updated;
  });
}
export async function listOrganisations() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(organisations).orderBy(asc(organisations.name));
}
export async function createOrganisation(
  actorUserId: string,
  input: InsertOrganisation
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const [created] = await tx.insert(organisations).values(input).returning();
    await writeAudit(
      tx,
      actorUserId,
      "organisation.created",
      "organisation",
      created.id
    );
    return created;
  });
}
export async function updateOrganisation(
  actorUserId: string,
  id: string,
  input: Partial<InsertOrganisation>
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const [updated] = await tx
      .update(organisations)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(organisations.id, id))
      .returning();
    if (!updated) throw new Error("Organisation not found");
    await writeAudit(
      tx,
      actorUserId,
      "organisation.updated",
      "organisation",
      id,
      { after: updated }
    );
    return updated;
  });
}
export async function listAuditLogs(limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(adminAuditLogs)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit);
}

export { WARWICKSHIRE_DISTRICTS };
