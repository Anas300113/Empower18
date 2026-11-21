// ─────────────────────────────────────────────────────────────────────────────
// Ashby Public Job Postings Connector
//
// Source: POST https://api.ashbyhq.com/job-posting-board
// Documentation: https://developers.ashbyhq.com/
// Authentication: API key via "access-token" header
// Rate limit: ~100 requests/minute
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CanonicalOpportunity,
  OpportunityConnector,
  SyncOptions,
} from "./base";
import { z } from "zod";

const ashbyJobPostingSchema = z.object({
  id: z.string(),
  title: z.string(),
  location: z.string().nullable(),
  departmentName: z.string().nullable(),
  employmentType: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
  applyUrl: z.string().url().nullable(),
  description: z.string().nullable(),
  employmentLevel: z.string().nullable(),
});

const ashbyResponseSchema = z.object({
  jobPostings: z.array(ashbyJobPostingSchema),
  nextCursor: z.string().nullable(),
});

function mapAshbyType(
  job: z.infer<typeof ashbyJobPostingSchema>
): string {
  const titleLower = job.title.toLowerCase();
  const descLower = (job.description ?? "").toLowerCase();
  const empType = (job.employmentType ?? "").toLowerCase();

  if (empType.includes("apprentice") || titleLower.includes("apprentice")) {
    return "apprenticeship";
  }
  if (empType.includes("intern") || titleLower.includes("intern")) {
    return "internship";
  }
  if (empType.includes("trainee") || titleLower.includes("trainee")) {
    return "traineeship";
  }
  if (
    empType.includes("part-time") ||
    empType.includes("part time") ||
    titleLower.includes("part-time") ||
    titleLower.includes("part time")
  ) {
    return "part_time";
  }
  if (
    empType.includes("full-time") ||
    empType.includes("full time") ||
    titleLower.includes("full-time") ||
    titleLower.includes("full time")
  ) {
    return "full_time";
  }
  if (
    empType.includes("volunteer") ||
    titleLower.includes("volunteer") ||
    descLower.includes("volunteer")
  ) {
    return "volunteering";
  }
  if (
    empType.includes("work experience") ||
    titleLower.includes("work experience") ||
    descLower.includes("work experience")
  ) {
    return "work_experience";
  }
  return "work_experience";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export class AshbyConnector implements OpportunityConnector {
  readonly id = "ashby";
  readonly providerName = "Ashby Public Job Postings";
  readonly providerHost = "api.ashbyhq.com";
  readonly capabilities = {
    supportsPagination: true,
    supportsRateLimitHeaders: false,
    requiresAuth: true,
  };
  readonly rateLimit = { requestsPerMinute: 100 };

  private readonly boardId: string;
  private readonly apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.ASHBY_API_KEY;
    this.boardId = apiKey ?? process.env.ASHBY_BOARD_ID ?? "";
    if (!this.boardId) {
      throw new Error(
        "Ashby connector requires ASHBY_BOARD_ID environment variable"
      );
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.fetchOpportunities({ sourceId: this.id, pageSize: 1 });
      return {
        ok: true,
        message: `Connected to Ashby board "${this.boardId}"`,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async fetchOpportunities(options?: SyncOptions): Promise<{
    items: CanonicalOpportunity[];
    nextCursor?: string | null;
    hasMore: boolean;
  }> {
    const cursor = options?.cursor ?? null;
    const pageSize = options?.pageSize ?? 50;
    const body = {
      jobPostingBoardId: this.boardId,
      cursor,
      includeCompensationBands: false,
      includeDepartments: true,
      includeLocations: true,
      limit: pageSize,
    };

    const response = await fetch("https://api.ashbyhq.com/job-posting-board", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access-token": this.apiKey ?? "",
        "User-Agent": "Empower18/1.0 (https://empower18.vercel.app)",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Ashby API returned ${response.status}: ${errorBody.slice(0, 200)}`
      );
    }

    const rawBody = await response.json();
    const parsed = ashbyResponseSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new Error(
        `Ashby API response validation failed: ${parsed.error.message}`
      );
    }

    const items: CanonicalOpportunity[] = parsed.data.jobPostings.map(posting => {
      const description = stripHtml(posting.description ?? "");
      const organisation = posting.departmentName || posting.location || null;

      return {
        sourceRecordId: posting.id,
        canonicalUrl: posting.applyUrl ?? "",
        externalApplicationUrl: posting.applyUrl ?? undefined,
        title: posting.title,
        description,
        summary: description.slice(0, 500) || null,
        type: mapAshbyType(posting),
        category: null,
        route: null,
        location: posting.location ?? null,
        district: null,
        deliveryMethod: null,
        isRemoteEligible: false,
        minAge: null,
        maxAge: null,
        educationRequirements: null,
        qualificationRequirements: null,
        requiredSkills: [],
        salaryMin: null,
        salaryMax: null,
        compensationText: null,
        applicationOpensAt: posting.publishedAt ? new Date(posting.publishedAt) : null,
        applicationDeadlineAt: null,
        startDateAt: null,
        expiresAt: posting.updatedAt ? new Date(posting.updatedAt) : null,
        applicationInstructions: null,
        organisationName: organisation,
        organisationWebsite: null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };
    });

    const nextCursor = parsed.data.nextCursor;
    return { items, nextCursor, hasMore: Boolean(nextCursor) };
  }
}
