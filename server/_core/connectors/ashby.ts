// ─────────────────────────────────────────────────────────────────────────────
// Ashby Public Job Postings Connector
//
// Source: GET https://api.ashbyhq.com/posting-api/job-board/{job_board_name}
// Documentation: https://developers.ashbyhq.com/docs/public-job-posting-api
// Authentication: None required (public job board API)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CanonicalOpportunity,
  ConnectorConfig,
  OpportunityConnector,
  SyncOptions,
} from "./base";
import { z } from "zod";

const ashbyJobSchema = z.object({
  title: z.string(),
  location: z.string().optional(),
  department: z.string().optional(),
  team: z.string().optional(),
  isRemote: z.boolean().optional(),
  workplaceType: z.string().optional(),
  descriptionHtml: z.string().optional(),
  descriptionPlain: z.string().optional(),
  publishedAt: z.string().datetime().optional(),
  employmentType: z.string().optional(),
  jobUrl: z.string().url(),
  applyUrl: z.string().url().optional(),
  isListed: z.boolean(),
});

const ashbyResponseSchema = z.object({
  apiVersion: z.string().optional(),
  jobs: z.array(ashbyJobSchema),
});

function mapAshbyType(job: z.infer<typeof ashbyJobSchema>): string {
  const titleLower = job.title.toLowerCase();
  const descriptionLower = (
    job.descriptionPlain ??
    job.descriptionHtml ??
    ""
  ).toLowerCase();
  const employmentType = (job.employmentType ?? "").toLowerCase();

  if (
    employmentType.includes("apprentice") ||
    titleLower.includes("apprentice") ||
    descriptionLower.includes("apprentice")
  )
    return "apprenticeship";
  if (employmentType.includes("intern") || titleLower.includes("intern"))
    return "internship";
  if (employmentType.includes("trainee") || titleLower.includes("trainee"))
    return "traineeship";
  if (employmentType.includes("part") || titleLower.includes("part-time"))
    return "part_time";
  if (employmentType.includes("full") || titleLower.includes("full-time"))
    return "full_time";
  if (
    titleLower.includes("volunteer") ||
    descriptionLower.includes("volunteer")
  )
    return "volunteering";
  if (
    titleLower.includes("work experience") ||
    descriptionLower.includes("work experience")
  )
    return "work_experience";
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
    supportsPagination: false,
    supportsRateLimitHeaders: false,
    requiresAuth: false,
  };
  readonly rateLimit = { requestsPerMinute: 100 };

  private readonly boardName: string;

  constructor(config?: ConnectorConfig) {
    this.boardName = config?.boardName ?? process.env.ASHBY_BOARD_NAME ?? "";
    if (!this.boardName) {
      throw new Error(
        "Ashby connector requires ASHBY_BOARD_NAME environment variable"
      );
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.fetchOpportunities({ sourceId: this.id, pageSize: 1 });
      return {
        ok: true,
        message: `Connected to Ashby board "${this.boardName}"`,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async fetchOpportunities(_options?: SyncOptions): Promise<{
    items: CanonicalOpportunity[];
    nextCursor?: string | null;
    hasMore: boolean;
  }> {
    const url = new URL(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(this.boardName)}`
    );
    url.searchParams.set("includeCompensation", "false");

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
        `Ashby API returned ${response.status}: ${errorBody.slice(0, 200)}`
      );
    }

    const parsed = ashbyResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new Error(
        `Ashby API response validation failed: ${parsed.error.message}`
      );
    }

    const items: CanonicalOpportunity[] = parsed.data.jobs
      .filter(job => job.isListed)
      .map(job => {
        const description =
          job.descriptionPlain ?? stripHtml(job.descriptionHtml ?? "");
        return {
          sourceRecordId: job.jobUrl,
          canonicalUrl: job.jobUrl,
          externalApplicationUrl: job.applyUrl,
          title: job.title,
          description,
          summary: description.slice(0, 500) || null,
          type: mapAshbyType(job),
          category: null,
          route: null,
          location: job.location ?? null,
          district: null,
          deliveryMethod: job.workplaceType ?? null,
          isRemoteEligible: job.isRemote ?? false,
          minAge: null,
          maxAge: null,
          educationRequirements: null,
          qualificationRequirements: null,
          requiredSkills: [],
          salaryMin: null,
          salaryMax: null,
          compensationText: null,
          applicationOpensAt: job.publishedAt
            ? new Date(job.publishedAt)
            : null,
          applicationDeadlineAt: null,
          startDateAt: null,
          expiresAt: null,
          applicationInstructions: null,
          organisationName: job.department ?? job.team ?? null,
          organisationWebsite: null,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        };
      });

    return { items, nextCursor: null, hasMore: false };
  }
}
