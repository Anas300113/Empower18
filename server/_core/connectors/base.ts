// ─────────────────────────────────────────────────────────────────────────────
// Empower18 Opportunity Connector Architecture
//
// Typed, allow-listed connectors for importing opportunities from approved
// employer job boards. Each connector retrieves approved source data, validates
// the response with Zod, converts it into a canonical Empower18 opportunity
// DTO, and reports sync results.
//
// Security rules:
// - Connectors call only fixed, allow-listed provider hosts.
// - No generic fetcher that makes arbitrary HTTP requests from database URLs.
// - API credentials come from server-side environment variables only.
// - Connectors never write directly to the browser bundle.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Canonical Empower18 opportunity DTO
// Maps every supported external source into a single canonical shape before
// being written to the `opportunities` table by the ingestion service.
// ─────────────────────────────────────────────────────────────────────────────

export interface CanonicalOpportunity {
  /** External source's unique identifier for this record (never reused) */
  sourceRecordId: string;
  /** Canonical URL of the opportunity on the source's own site */
  canonicalUrl: string;
  /** Official application URL (may differ from canonicalUrl) */
  externalApplicationUrl?: string;
  title: string;
  description: string;
  summary?: string | null;
  type: string; // opportunity_type enum value
  category?: string | null;
  route?: string | null;
  location?: string | null;
  district?: string | null;
  deliveryMethod?: string | null;
  isRemoteEligible?: boolean;
  minAge?: number | null;
  maxAge?: number | null;
  educationRequirements?: string | null;
  qualificationRequirements?: string | null;
  requiredSkills?: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
  compensationText?: string | null;
  applicationOpensAt?: Date | null;
  applicationDeadlineAt?: Date | null;
  startDateAt?: Date | null;
  expiresAt?: Date | null;
  applicationInstructions?: string | null;
  organisationName?: string | null;
  organisationWebsite?: string | null;
  /** When this record was first seen by our ingestion pipeline */
  firstSeenAt?: Date | null;
  /** When this record was most recently observed by our pipeline */
  lastSeenAt?: Date | null;
  /** True when an importer could not safely classify the opportunity. */
  classificationNeedsReview?: boolean;
}

/** Result of a single connector sync run */
export interface SyncResult {
  sourceId: string;
  sourceName: string;
  startedAt: Date;
  completedAt: Date | null;
  status: "success" | "partial" | "failed";
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: SyncError[];
  warnings: SyncWarning[];
}

/** A single error encountered during sync */
export interface SyncError {
  sourceRecordId?: string;
  message: string;
  fatal: boolean; // if true, the whole sync is considered failed
}

/** A non-fatal warning during sync */
export interface SyncWarning {
  sourceRecordId?: string;
  message: string;
}

/** Configuration for rate limiting per source */
export interface RateLimitConfig {
  requestsPerMinute: number;
  burst?: number;
}

/** Provider host allow-list – connectors may only call these hosts */
export const ALLOWED_PROVIDER_HOSTS = [
  "boards.greenhouse.io",
  "boards-api.greenhouse.io",
  "api.ashbyhq.com",
  "api.lever.co",
  "api.apprenticeships.education.gov.uk",
] as const;

export type AllowedProviderHost = (typeof ALLOWED_PROVIDER_HOSTS)[number];

/** Validate that a host is on the allow-list */
export function isAllowedHost(host: string): host is AllowedProviderHost {
  return ALLOWED_PROVIDER_HOSTS.includes(host as AllowedProviderHost);
}

/** Connector capability flags */
export interface ConnectorCapabilities {
  supportsPagination: boolean;
  supportsRateLimitHeaders: boolean;
  requiresAuth: boolean;
}

/** Base connector interface that every provider must implement */
export interface OpportunityConnector {
  /** Human-readable provider name */
  readonly providerName: string;
  /** Provider host (must be on ALLOWED_PROVIDER_HOSTS) */
  readonly providerHost: AllowedProviderHost;
  /** Connector capabilities */
  readonly capabilities: ConnectorCapabilities;
  /** Rate limit configuration */
  readonly rateLimit: RateLimitConfig;

  /** Fetch opportunities from the source, respecting pagination */
  fetchOpportunities(options?: {
    cursor?: string | null;
    since?: Date | null;
    pageSize?: number;
  }): Promise<{
    items: CanonicalOpportunity[];
    nextCursor?: string | null;
    hasMore: boolean;
  }>;

  /** Validate that the connector can reach the source (health check) */
  healthCheck(): Promise<{ ok: boolean; message?: string }>;

  /** Get the connector's unique identifier */
  readonly id: string;
}

/** Sync execution options */
export interface SyncOptions {
  sourceId: string;
  cursor?: string | null;
  since?: Date | null;
  pageSize?: number;
  maxPages?: number;
}

/** Connector registration metadata */
export interface ConnectorRegistration {
  id: string;
  providerName: string;
  providerHost: AllowedProviderHost;
  capabilities: ConnectorCapabilities;
  rateLimit: RateLimitConfig;
  createConnector: (config?: ConnectorConfig) => OpportunityConnector;
}

/** Public identifiers and server-only credentials are intentionally separate. */
export interface ConnectorConfig {
  boardToken?: string;
  boardName?: string;
  company?: string;
  apiKey?: string;
}

/** Zod schema for validating external API error responses */
export const apiErrorSchema = z.object({
  message: z.string().optional(),
  errors: z.array(z.any()).optional(),
});
