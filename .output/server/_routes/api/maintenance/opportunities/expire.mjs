import { d as defineHandler, s as setHeader, g as getMethod, f as setResponseStatus, i as getHeader } from "../../../../_libs/h3.mjs";
import { createHash, timingSafeEqual } from "node:crypto";
import { p as pgTable, u as uuid, a as pgSchema, t as timestamp, b as pgEnum, c as boolean, d as text, v as varchar, n as numeric, i as integer, j as jsonb, s as serial, e as uniqueIndex, f as index, g as drizzle, h as eq, k as and, o as or, l as lte, m as lt, q as asc } from "../../../../_libs/drizzle-orm.mjs";
import { P as Postgres } from "../../../../_libs/postgres.mjs";
import "../../../../_libs/rou3.mjs";
import "../../../../_libs/srvx.mjs";
import "node:http";
import "node:stream";
import "node:stream/promises";
import "node:https";
import "node:http2";
import "os";
import "fs";
import "util";
import "diagnostics_channel";
import "crypto";
import "net";
import "tls";
import "stream";
const auth = pgSchema("auth");
const authUsers = auth.table("users", {
  id: uuid("id").primaryKey(),
  email: varchar("email", { length: 320 }),
  rawUserMetaData: jsonb("raw_user_meta_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
});
const userRoleEnum = pgEnum("user_role", [
  "student",
  "employer",
  "admin"
]);
const opportunityTypeEnum = pgEnum("opportunity_type", [
  "apprenticeship",
  "internship",
  "traineeship",
  "part_time",
  "full_time",
  "volunteering",
  "work_experience"
]);
const opportunityStatusEnum = pgEnum("opportunity_status", [
  "draft",
  "pending_review",
  "published",
  "paused",
  "closed",
  "expired"
]);
const applicationStageEnum = pgEnum("application_stage", [
  "interested",
  "started",
  "submitted",
  "under_review",
  "interview",
  "offer",
  "rejected",
  "withdrawn"
]);
const notificationTypeEnum = pgEnum("notification_type", [
  "application_update",
  "deadline_reminder",
  "new_opportunity",
  "message",
  "system"
]);
const outboxStatusEnum = pgEnum("outbox_status", [
  "pending",
  "processing",
  "sent",
  "failed",
  "dead_letter"
]);
const sourceTypeEnum = pgEnum("source_type", [
  "api",
  "rss",
  "web_scrape",
  "manual",
  "email_parse"
]);
const reliabilityStatusEnum = pgEnum("reliability_status", [
  "unknown",
  "healthy",
  "degraded",
  "unhealthy"
]);
const organisationTypeEnum = pgEnum("organisation_type", [
  "employer",
  "training_provider",
  "college",
  "university",
  "charity",
  "government",
  "agency",
  "other"
]);
pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: varchar("role", { length: 32 }).notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull()
});
pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 120 }),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Europe/London"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [uniqueIndex("profiles_user_id_idx").on(t.userId)]
).enableRLS();
pgTable(
  "student_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    ageBand: varchar("age_band", { length: 16 }),
    district: varchar("district", { length: 64 }),
    educationLevel: varchar("education_level", { length: 64 }),
    interests: text("interests").array().notNull().default([]),
    routesOfInterest: text("routes_of_interest").array().notNull().default([]),
    goals: text("goals"),
    accessibilityNeeds: text("accessibility_needs"),
    onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [uniqueIndex("student_profiles_user_id_idx").on(t.userId)]
).enableRLS();
const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull().default("student"),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
    grantedBy: uuid("granted_by").references(() => authUsers.id)
  },
  (t) => [
    index("user_roles_user_id_idx").on(t.userId),
    uniqueIndex("user_roles_user_id_role_idx").on(t.userId, t.role)
  ]
).enableRLS();
const organisations = pgTable(
  "organisations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    type: organisationTypeEnum("type"),
    website: varchar("website", { length: 512 }),
    description: text("description"),
    location: varchar("location", { length: 255 }),
    isVerified: boolean("is_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("organisations_name_idx").on(t.name)]
).enableRLS();
const opportunitySources = pgTable(
  "opportunity_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    organisation: varchar("organisation", { length: 255 }),
    type: sourceTypeEnum("type").notNull(),
    officialUrl: varchar("official_url", { length: 512 }),
    apiEndpoint: varchar("api_endpoint", { length: 512 }),
    authRequired: boolean("auth_required").notNull().default(false),
    apiKeyReference: varchar("api_key_reference", { length: 128 }),
    permittedUse: text("permitted_use"),
    termsOfServiceUrl: varchar("terms_of_service_url", { length: 512 }),
    retrievalSchedule: varchar("retrieval_schedule", { length: 64 }),
    rateLimit: varchar("rate_limit", { length: 64 }),
    lastSuccessfulSync: timestamp("last_successful_sync", {
      withTimezone: true
    }),
    lastFailedSync: timestamp("last_failed_sync", { withTimezone: true }),
    reliabilityStatus: reliabilityStatusEnum("reliability_status").notNull().default("unknown"),
    sourceAuthority: varchar("source_authority", { length: 64 }),
    administratorOwner: varchar("administrator_owner", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("opportunity_sources_name_idx").on(t.name)]
).enableRLS();
const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    summary: text("summary"),
    type: opportunityTypeEnum("type").notNull(),
    category: varchar("category", { length: 64 }),
    route: varchar("route", { length: 64 }),
    status: opportunityStatusEnum("status").notNull().default("draft"),
    location: varchar("location", { length: 255 }),
    district: varchar("district", { length: 64 }),
    deliveryMethod: varchar("delivery_method", { length: 32 }),
    isRemoteEligible: boolean("is_remote_eligible").notNull().default(false),
    minAge: integer("min_age"),
    maxAge: integer("max_age"),
    educationRequirements: text("education_requirements"),
    qualificationRequirements: text("qualification_requirements"),
    requiredSkills: text("required_skills").array().notNull().default([]),
    salaryMin: numeric("salary_min", { precision: 10, scale: 2 }),
    salaryMax: numeric("salary_max", { precision: 10, scale: 2 }),
    compensationText: text("compensation_text"),
    applicationOpensAt: timestamp("application_opens_at", {
      withTimezone: true
    }),
    applicationDeadlineAt: timestamp("application_deadline_at", {
      withTimezone: true
    }),
    startDateAt: timestamp("start_date_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    externalApplicationUrl: varchar("external_application_url", {
      length: 1024
    }),
    applicationInstructions: text("application_instructions"),
    sourceId: uuid("source_id").references(() => opportunitySources.id, {
      onDelete: "set null"
    }),
    sourceRecordId: varchar("source_record_id", { length: 255 }),
    canonicalUrl: varchar("canonical_url", { length: 1024 }),
    verifiedBy: uuid("verified_by").references(() => authUsers.id, {
      onDelete: "set null"
    }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verificationEvidence: text("verification_evidence"),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index("opportunities_status_idx").on(t.status),
    index("opportunities_type_idx").on(t.type),
    index("opportunities_category_idx").on(t.category),
    index("opportunities_route_idx").on(t.route),
    index("opportunities_deadline_idx").on(t.applicationDeadlineAt),
    index("opportunities_source_id_idx").on(t.sourceId),
    index("opportunities_is_published_idx").on(t.isPublished),
    index("opportunities_expires_at_idx").on(t.expiresAt),
    uniqueIndex("opportunities_canonical_url_unique_idx").on(t.canonicalUrl),
    uniqueIndex("opportunities_source_record_unique_idx").on(
      t.sourceId,
      t.sourceRecordId
    )
  ]
).enableRLS();
pgTable(
  "opportunity_organisations",
  {
    opportunityId: uuid("opportunity_id").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
    organisationId: uuid("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 64 }).notNull().default("provider"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    uniqueIndex("opportunity_organisations_opp_org_idx").on(
      t.opportunityId,
      t.organisationId
    ),
    index("opportunity_organisations_opportunity_id_idx").on(t.opportunityId),
    index("opportunity_organisations_organisation_id_idx").on(t.organisationId)
  ]
).enableRLS();
pgTable(
  "saved_opportunities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
    savedAt: timestamp("saved_at", { withTimezone: true }).defaultNow().notNull(),
    notes: text("notes")
  },
  (t) => [
    index("saved_opportunities_user_id_idx").on(t.userId),
    uniqueIndex("saved_opportunities_user_id_opportunity_id_idx").on(
      t.userId,
      t.opportunityId
    )
  ]
).enableRLS();
const studentApplications = pgTable(
  "student_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
    stage: applicationStageEnum("stage").notNull().default("interested"),
    isSubmitted: boolean("is_submitted").notNull().default(false),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index("student_applications_user_id_idx").on(t.userId),
    index("student_applications_opportunity_id_idx").on(t.opportunityId),
    index("student_applications_stage_idx").on(t.stage),
    uniqueIndex("student_applications_user_opportunity_idx").on(
      t.userId,
      t.opportunityId
    )
  ]
).enableRLS();
pgTable(
  "application_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id").notNull().references(() => studentApplications.id, { onDelete: "cascade" }),
    stage: applicationStageEnum("stage").notNull(),
    changedBy: uuid("changed_by").notNull().references(() => authUsers.id),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
    reason: text("reason")
  },
  (t) => [index("application_events_application_id_idx").on(t.applicationId)]
).enableRLS();
pgTable(
  "application_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id").notNull().references(() => studentApplications.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("application_tasks_application_id_idx").on(t.applicationId)]
).enableRLS();
pgTable(
  "resumes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    storagePath: varchar("storage_path", { length: 512 }).notNull(),
    contentType: varchar("content_type", { length: 128 }),
    fileSizeBytes: integer("file_size_bytes"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index("resumes_user_id_idx").on(t.userId),
    index("resumes_is_default_idx").on(t.isDefault)
  ]
).enableRLS();
pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    linkUrl: varchar("link_url", { length: 1024 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_is_read_idx").on(t.isRead),
    index("notifications_created_at_idx").on(t.createdAt)
  ]
).enableRLS();
pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    deadlineReminders: boolean("deadline_reminders").notNull().default(true),
    newOpportunities: boolean("new_opportunities").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [uniqueIndex("notification_preferences_user_id_idx").on(t.userId)]
).enableRLS();
pgTable(
  "notification_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    linkUrl: varchar("link_url", { length: 1024 }),
    status: outboxStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    lastError: text("last_error"),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true })
  },
  (t) => [
    index("notification_outbox_status_idx").on(t.status),
    index("notification_outbox_next_attempt_idx").on(t.nextAttemptAt),
    index("notification_outbox_user_id_idx").on(t.userId)
  ]
).enableRLS();
const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => authUsers.id, {
      onDelete: "set null"
    }),
    action: varchar("action", { length: 128 }).notNull(),
    targetType: varchar("target_type", { length: 64 }).notNull(),
    targetId: uuid("target_id"),
    details: jsonb("details"),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: varchar("user_agent", { length: 512 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index("admin_audit_logs_actor_id_idx").on(t.actorUserId),
    index("admin_audit_logs_target_idx").on(t.targetType, t.targetId),
    index("admin_audit_logs_created_at_idx").on(t.createdAt)
  ]
).enableRLS();
const RUNTIME_URL = process.env.DATABASE_URL ?? "";
process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
const POOL_MAX = Number(
  process.env.DATABASE_POOL_MAX ?? (process.env.VERCEL ? "1" : "10")
);
const IDLE_TIMEOUT = Number(process.env.DATABASE_IDLE_TIMEOUT ?? "20");
const CONNECT_TIMEOUT = Number(process.env.DATABASE_CONNECT_TIMEOUT ?? "10");
function makePool(url) {
  return Postgres(url, {
    max: POOL_MAX,
    idle_timeout: IDLE_TIMEOUT,
    connect_timeout: CONNECT_TIMEOUT
  });
}
let _runtimeSql = null;
let _db = null;
async function getDb() {
  if (!_db && RUNTIME_URL) {
    try {
      _runtimeSql = makePool(RUNTIME_URL);
      _db = drizzle(_runtimeSql);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function getUserRoles(userId) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId));
  return result.map((r) => r.role);
}
async function writeAudit(tx, actorUserId, action, targetType, targetId, details = {}) {
  await tx.insert(adminAuditLogs).values({ actorUserId, action, targetType, targetId, details });
}
async function transitionOpportunity(actorUserId, id, to, details = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
    if (!before) throw new Error("Opportunity not found");
    const allowed = {
      draft: ["pending_review", "closed"],
      pending_review: ["draft", "published", "closed"],
      published: ["paused", "closed", "expired"],
      paused: ["published", "closed"],
      closed: [],
      expired: []
    };
    if (!allowed[before.status].includes(to))
      throw new Error(
        `Invalid opportunity transition: ${before.status} -> ${to}`
      );
    const [updated] = await tx.update(opportunities).set({
      status: to,
      isPublished: to === "published",
      updatedAt: /* @__PURE__ */ new Date(),
      ...{}
    }).where(eq(opportunities.id, id)).returning();
    await writeAudit(tx, actorUserId, `opportunity.${to}`, "opportunity", id, {
      before,
      after: updated,
      ...details
    });
    return updated;
  });
}
async function expireDueOpportunities(actorUserId, now = /* @__PURE__ */ new Date(), batchSize = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const expired = [];
  while (true) {
    const due = await db.select({
      id: opportunities.id,
      applicationDeadlineAt: opportunities.applicationDeadlineAt
    }).from(opportunities).where(
      and(
        eq(opportunities.status, "published"),
        eq(opportunities.isPublished, true),
        or(
          lt(opportunities.applicationDeadlineAt, now),
          lte(opportunities.expiresAt, now)
        )
      )
    ).orderBy(
      asc(opportunities.applicationDeadlineAt),
      asc(opportunities.expiresAt),
      asc(opportunities.id)
    ).limit(batchSize);
    if (due.length === 0) return expired;
    for (const item of due) {
      expired.push(
        await transitionOpportunity(actorUserId, item.id, "expired", {
          reason: item.applicationDeadlineAt && item.applicationDeadlineAt < now ? "Application deadline passed" : "Listing expiry date passed"
        })
      );
    }
  }
}
function matchesSecret(candidate, expected) {
  const candidateDigest = createHash("sha256").update(candidate).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}
async function handleOpportunityExpiry(authorization) {
  const expectedSecret = process.env.OPPORTUNITY_EXPIRY_SECRET;
  const actorUserId = process.env.OPPORTUNITY_EXPIRY_ACTOR_USER_ID;
  if (!expectedSecret || expectedSecret.length < 32 || !actorUserId) {
    return {
      status: 503,
      body: { error: "Maintenance endpoint is not configured" }
    };
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? "");
  if (!match || !matchesSecret(match[1], expectedSecret)) {
    return { status: 401, body: { error: "Unauthorized" } };
  }
  if (!process.env.DATABASE_URL) {
    return {
      status: 503,
      body: { error: "Maintenance database is not configured" }
    };
  }
  try {
    const roles = await getUserRoles(actorUserId);
    if (!roles.includes("admin")) {
      return {
        status: 503,
        body: { error: "Configured maintenance actor is not an administrator" }
      };
    }
    const expired = await expireDueOpportunities(actorUserId);
    return { status: 200, body: { expiredCount: expired.length } };
  } catch (error) {
    console.error("Opportunity expiry maintenance failed", error);
    return { status: 500, body: { error: "Opportunity expiry failed" } };
  }
}
const expire = defineHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  if (getMethod(event) !== "POST") {
    setHeader(event, "Allow", "POST");
    setResponseStatus(event, 405);
    return { error: "Method not allowed" };
  }
  const result = await handleOpportunityExpiry(
    getHeader(event, "authorization")
  );
  setResponseStatus(event, result.status);
  return result.body;
});
export {
  expire as default
};
