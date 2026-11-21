// ─────────────────────────────────────────────────────────────────────────────
// Lever Postings Connector
//
// Source: GET https://api.lever.co/v0/postings/{company}?mode=json
// Documentation: https://api.lever.co/v0/postings
// Authentication: None required (public API)
// Rate limit: ~100 requests/minute
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CanonicalOpportunity,
  ConnectorConfig,
  OpportunityConnector,
  SyncOptions,
} from "./base";
import { z } from "zod";

const leverPostingSchema = z.object({
  id: z.string(),
  text: z.string(),
  title: z.string(),
  descriptionPlain: z.string().nullable(),
  description: z.string().nullable(),
  categories: z
    .object({
      location: z.string().nullable(),
      department: z.string().nullable(),
      team: z.string().nullable(),
    })
    .nullable(),
  location: z.string().nullable(),
  applyUrl: z.string().url().nullable(),
  updatedAt: z.number().nullable(),
  createdAt: z.number().nullable(),
});

const leverResponseSchema = z.array(leverPostingSchema);

function mapLeverType(posting: z.infer<typeof leverPostingSchema>): string {
  const titleLower = posting.title.toLowerCase();
  const descLower = (posting.descriptionPlain ?? "").toLowerCase();

  if (titleLower.includes("apprentice") || descLower.includes("apprentice")) {
    return "apprenticeship";
  }
  if (titleLower.includes("intern") || descLower.includes("intern")) {
    return "internship";
  }
  if (titleLower.includes("trainee") || descLower.includes("trainee")) {
    return "traineeship";
  }
  if (titleLower.includes("part-time") || titleLower.includes("part time")) {
    return "part_time";
  }
  if (titleLower.includes("full-time") || titleLower.includes("full time")) {
    return "full_time";
  }
  if (titleLower.includes("volunteer") || descLower.includes("volunteer")) {
    return "volunteering";
  }
  if (
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

export class LeverConnector implements OpportunityConnector {
  readonly id = "lever";
  readonly providerName = "Lever Postings";
  readonly providerHost = "api.lever.co";
  readonly capabilities = {
    supportsPagination: true,
    supportsRateLimitHeaders: false,
    requiresAuth: false,
  };
  readonly rateLimit = { requestsPerMinute: 100 };

  private readonly company: string;

  constructor(config?: ConnectorConfig) {
    this.company = config?.company ?? process.env.LEVER_COMPANY ?? "";
    if (!this.company) {
      throw new Error(
        "Lever connector requires LEVER_COMPANY environment variable"
      );
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.fetchOpportunities({ sourceId: this.id, pageSize: 1 });
      return {
        ok: true,
        message: `Connected to Lever company "${this.company}"`,
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
    const skip = (options?.cursor ? parseInt(options.cursor, 10) : 0) || 0;
    const pageSize = options?.pageSize ?? 50;
    const url = new URL(
      `https://api.lever.co/v0/postings/${this.company}?mode=json`
    );
    url.searchParams.set("skip", String(skip));
    url.searchParams.set("limit", String(pageSize));

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
        `Lever API returned ${response.status}: ${errorBody.slice(0, 200)}`
      );
    }

    const parsed = leverResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new Error(
        `Lever API response validation failed: ${parsed.error.message}`
      );
    }

    const items: CanonicalOpportunity[] = parsed.data.map(posting => {
      const rawDescription =
        posting.descriptionPlain ?? posting.description ?? "";
      const description = stripHtml(rawDescription);
      const organisation =
        posting.categories?.department || posting.categories?.team || null;

      return {
        sourceRecordId: posting.id,
        canonicalUrl: posting.applyUrl ?? "",
        externalApplicationUrl: posting.applyUrl ?? undefined,
        title: posting.title,
        description,
        summary: description.slice(0, 500) || null,
        type: mapLeverType(posting),
        category: null,
        route: null,
        location: posting.location ?? posting.categories?.location ?? null,
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
        applicationOpensAt: posting.createdAt
          ? new Date(posting.createdAt)
          : null,
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

    const hasMore = items.length === pageSize;
    return {
      items,
      nextCursor: hasMore ? String(skip + pageSize) : null,
      hasMore,
    };
  }
}
