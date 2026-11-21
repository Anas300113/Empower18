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
  ConnectorConfig,
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
  id: z.coerce.string(),
  title: z.string(),
  absolute_url: z.string().url(),
  content: z.string(),
  location: greenhouseLocationSchema.nullable(),
  departments: z.array(greenhouseDepartmentSchema).optional(),
  offices: z.array(z.object({ name: z.string().optional() })).optional(),
  updated_at: z.string().datetime(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const greenhouseResponseSchema = z.object({
  jobs: z.array(greenhouseJobSchema),
  meta: z.object({ total: z.number().optional() }).optional(),
});

function mapGreenhouseType(job: z.infer<typeof greenhouseJobSchema>): string {
  const titleLower = job.title.toLowerCase();
  const contentLower = job.content.toLowerCase();

  if (
    titleLower.includes("apprentice") ||
    contentLower.includes("apprentice")
  ) {
    return "apprenticeship";
  }
  if (titleLower.includes("intern") || contentLower.includes("intern")) {
    return "internship";
  }
  if (titleLower.includes("trainee") || contentLower.includes("trainee")) {
    return "traineeship";
  }
  if (titleLower.includes("part-time") || titleLower.includes("part time")) {
    return "part_time";
  }
  if (titleLower.includes("full-time") || titleLower.includes("full time")) {
    return "full_time";
  }
  if (titleLower.includes("volunteer") || contentLower.includes("volunteer")) {
    return "volunteering";
  }
  if (
    titleLower.includes("work experience") ||
    contentLower.includes("work experience")
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

export class GreenhouseConnector implements OpportunityConnector {
  readonly id = "greenhouse";
  readonly providerName = "Greenhouse Job Board";
  readonly providerHost = "boards-api.greenhouse.io";
  readonly capabilities = {
    supportsPagination: true,
    supportsRateLimitHeaders: false,
    requiresAuth: false,
  };
  readonly rateLimit = { requestsPerMinute: 60 };

  private readonly boardToken: string;

  constructor(config?: ConnectorConfig) {
    this.boardToken =
      config?.boardToken ?? process.env.GREENHOUSE_BOARD_TOKEN ?? "";
    if (!this.boardToken) {
      throw new Error(
        "Greenhouse connector requires GREENHOUSE_BOARD_TOKEN environment variable"
      );
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.fetchOpportunities({ sourceId: this.id, pageSize: 1 });
      return {
        ok: true,
        message: `Connected to Greenhouse board "${this.boardToken}"`,
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
    const url = new URL(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(this.boardToken)}/jobs`
    );
    url.searchParams.set("content", "true");

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

    const parsed = greenhouseResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new Error(
        `Greenhouse API response validation failed: ${parsed.error.message}`
      );
    }

    const items: CanonicalOpportunity[] = parsed.data.jobs.map(job => {
      const location = job.location?.name ?? null;
      const department = job.departments
        ?.map(department => department.name)
        .filter(Boolean)
        .join(", ");
      const office = job.offices
        ?.map(office => office.name)
        .filter(Boolean)
        .join(", ");
      const description = stripHtml(job.content);

      return {
        sourceRecordId: job.id,
        canonicalUrl: job.absolute_url,
        externalApplicationUrl: job.absolute_url,
        title: job.title,
        description,
        summary: description.slice(0, 500) || null,
        type: mapGreenhouseType(job),
        category: null,
        route: null,
        location,
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
        organisationName: department || office || null,
        organisationWebsite: null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };
    });

    return {
      items,
      nextCursor: null,
      hasMore: false,
    };
  }
}
