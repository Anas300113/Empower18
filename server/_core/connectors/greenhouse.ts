// ─────────────────────────────────────────────────────────────────────────────
// Greenhouse Job Board Connector
//
// Source: https://boards.greenhouse.io/{board_id}/jobs
// Documentation: https://developer.greenhouse.io/job-board-api
// Authentication: None required (public board API)
// Rate limit: ~60 requests/minute (conservative)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CanonicalOpportunity,
  OpportunityConnector,
  SyncOptions,
} from "./base";
import { z } from "zod";

const greenhouseLocationSchema = z.object({
  name: z.string().optional(),
});

const greenhouseDepartmentSchema = z.object({
  name: z.string().optional(),
});

const greenhouseJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  absolute_url: z.string().url(),
  content: z.string(),
  location: greenhouseLocationSchema.nullable(),
  departments: z.array(greenhouseDepartmentSchema).optional(),
  offices: z.array(
    z.object({ name: z.string().optional() })
  ).optional(),
  updated_at: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

const greenhouseResponseSchema = z.object({
  jobs: z.array(greenhouseJobSchema),
});

const greenhouseErrorSchema = z.object({
function mapGreenhouseType(
  job: z.infer<typeof greenhouseJobSchema>
): string {
  const titleLower = job.title.toLowerCase();
  const contentLower = job.content.toLowerCase();

  if (
    titleLower.includes("apprentice") ||
    contentLower.includes("apprentice")
  ) {
    return "apprenticeship";
  }
  if (
    titleLower.includes("intern") ||
    contentLower.includes("intern")
  ) {
    return "internship";
  }
  if (
    titleLower.includes("trainee") ||
    contentLower.includes("trainee")
  ) {
    return "traineeship";
  }
  if (
    titleLower.includes("part-time") ||
    titleLower.includes("part time")
  ) {
    return "part_time";
  }
  if (
    titleLower.includes("full-time") ||
    titleLower.includes("full time")
  ) {
    return "full_time";
  }
  if (
    titleLower.includes("volunteer") ||
    contentLower.includes("volunteer")
  ) {
    return "volunteering";
  }
  if (
    titleLower.includes("work experience") ||
    contentLower.includes("work experience")
  ) {
    return "work_experience";
  }
  return "work_experience";

// ─────────────────────────────────────────────────────────────────────────────
// Greenhouse connector implementation
// ─────────────────────────────────────────────────────────────────────────────

export class GreenhouseConnector implements OpportunityConnector {
  readonly id = "greenhouse";
  readonly providerName = "Greenhouse Job Board";
  readonly providerHost = "boards.greenhouse.io";
  readonly capabilities = {
    supportsPagination: true,
    supportsRateLimitHeaders: false,
    requiresAuth: false,
  };
  readonly rateLimit = { requestsPerMinute: 60 };

  private readonly boardId: string;

  constructor(apiKey?: string) {
    // Greenhouse board API does not require auth for public boards.
    // apiKey would contain the board identifier if provided via env.
    this.boardId = apiKey ?? process.env.GREENHOUSE_BOARD_ID ?? "";
    if (!this.boardId) {
      throw new Error(
        "Greenhouse connector requires GREENHOUSE_BOARD_ID environment variable"
      );
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    try {
      const result = await this.fetchOpportunities({ pageSize: 1 });
      return {
        ok: true,
        message: `Connected to Greenhouse board "${this.boardId}"`,
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
    const page = (options?.cursor ? parseInt(options.cursor, 10) : 1) || 1;
    const pageSize = options?.pageSize ?? 50;

    const url = new URL(
      `https://boards.greenhouse.io/${this.boardId}/jobs`
    );
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Empower18/1.0 (https://empower18.vercel.app)",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Greenhouse API returned ${response.status}: ${errorBody.slice(0, 200)}`
      );
    }

    const body = await response.json();
    const parsed = greenhouseResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error(
        `Greenhouse API response validation failed: ${parsed.error.message}`
      );
    }

    const jobs = parsed.data.jobs;
    const items: CanonicalOpportunity[] = jobs.map(job => {
      const locationName = job.location?.name ?? null;
      const departmentNames = job.departments
        ?.map(d => d.name)
        .filter(Boolean)
        .join(", ");
      const officeNames = job.offices
        ?.map(o => o.name)
        .filter(Boolean)
        .join(", ");
      const organisation = departmentNames || officeNames || null;

      return {
        sourceRecordId: job.id,
        canonicalUrl: job.absolute_url,
        externalApplicationUrl: job.absolute_url,
        title: job.title,
        description: stripHtml(job.content),
        summary: stripHtml(job.content).slice(0, 500) || null,
        type: mapGreenhouseType(job),
        category: null,
        route: null,
        location: locationName,
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
        applicationOpensAt: null,
        applicationDeadlineAt: null,
        startDateAt: null,
        expiresAt: null,
        applicationInstructions: null,
        organisationName: organisation,
        organisationWebsite: null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };
    });

    const nextCursor = jobs.length === pageSize ? String(page + 1) : null;

    return {
      items,
      nextCursor,
      hasMore: jobs.length === pageSize,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: strip HTML tags from Greenhouse content
// ─────────────────────────────────────────────────────────────────────────────

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
}
  error: z.string().optional(),
  message: z.string().optional(),
});