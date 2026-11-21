// ─────────────────────────────────────────────────────────────────────────────
// GOV.UK Find an Apprenticeship Display Advert Connector (API v2)
//
// Source: GET https://findapprenticeshiptraining.sfa.bis.gov.uk/api/v2/display-adverts
// Documentation: https://developer-service.herokuapp.com/api-documentation/
// Authentication: None required (public API)
// Rate limit: ~30 requests/minute
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CanonicalOpportunity,
  OpportunityConnector,
  SyncOptions,
} from "./base";
import { z } from "zod";

const govukAdvertSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  employerName: z.string().nullable(),
  employerWebsite: z.string().url().nullable(),
  location: z.string().nullable(),
  town: z.string().nullable(),
  county: z.string().nullable(),
  postcode: z.string().nullable(),
  wage: z.string().nullable(),
  wageType: z.string().nullable(),
  hoursPerWeek: z.number().nullable(),
  closingDate: z.string().datetime().nullable(),
  startDate: z.string().datetime().nullable(),
  level: z.string().nullable(),
  duration: z.string().nullable(),
  weeklyHours: z.number().nullable(),
  potentialEmployer: z.string().nullable(),
  referenceNumber: z.string().nullable(),
});

const govukResponseSchema = z.object({
  adverts: z.array(govukAdvertSchema),
  totalCount: z.number().nullable(),
  pageNumber: z.number().nullable(),
  pageSize: z.number().nullable(),
});

function mapGovukLevel(
  level?: string | null
): string {
  if (!level) return "apprenticeship";
  const l = level.toLowerCase();
  if (l.includes("degree") || l.includes("level 6") || l.includes("level 7")) {
    return "apprenticeship";
  }
  if (l.includes("advanced") || l.includes("level 3")) {
    return "apprenticeship";
  }
  if (l.includes("intermediate") || l.includes("level 2")) {
    return "apprenticeship";
  }
  if (l.includes("higher") || l.includes("level 4") || l.includes("level 5")) {
    return "apprenticeship";
  }
  return "apprenticeship";
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

export class GovUkConnector implements OpportunityConnector {
  readonly id = "govuk";
  readonly providerName = "GOV.UK Find an Apprenticeship";
  readonly providerHost = "findapprenticeshiptraining.sfa.bis.gov.uk";
  readonly capabilities = {
    supportsPagination: true,
    supportsRateLimitHeaders: false,
    requiresAuth: false,
  };
  readonly rateLimit = { requestsPerMinute: 30 };

  constructor() {
    // No API key required for GOV.UK public API
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.fetchOpportunities({ sourceId: this.id, pageSize: 1 });
      return {
        ok: true,
        message: "Connected to GOV.UK Find an Apprenticeship API",
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
      "https://findapprenticeshiptraining.sfa.bis.gov.uk/api/v2/display-adverts"
    );
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));

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
        `GOV.UK API returned ${response.status}: ${errorBody.slice(0, 200)}`
      );
    }

    const rawBody = await response.json();
    const parsed = govukResponseSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new Error(
        `GOV.UK API response validation failed: ${parsed.error.message}`
      );
    }

    const adverts = parsed.data.adverts;
    const items: CanonicalOpportunity[] = adverts.map(advert => {
      const location =
        advert.location ||
        advert.town ||
        advert.county ||
        null;
      const organisation =
        advert.employerName || null;

      return {
        sourceRecordId: advert.id,
        canonicalUrl: `https://findapprenticeshiptraining.sfa.bis.gov.uk/advert/${advert.id}`,
        externalApplicationUrl: undefined,
        title: advert.title,
        description: stripHtml(advert.description ?? ""),
        summary:
          advert.description != null
            ? stripHtml(advert.description).slice(0, 500) || null
            : null,
        type: mapGovukLevel(advert.level),
        category: null,
        route: null,
        location,
        district: advert.county ?? null,
        deliveryMethod: null,
        isRemoteEligible: false,
        minAge: null,
        maxAge: null,
        educationRequirements: null,
        qualificationRequirements: null,
        requiredSkills: [],
        salaryMin: null,
        salaryMax: null,
        compensationText: advert.wage ?? null,
        applicationOpensAt: null,
        applicationDeadlineAt: advert.closingDate
          ? new Date(advert.closingDate)
          : null,
        startDateAt: advert.startDate
          ? new Date(advert.startDate)
          : null,
        expiresAt: advert.closingDate
          ? new Date(advert.closingDate)
          : null,
        applicationInstructions: null,
        organisationName: organisation,
        organisationWebsite: advert.employerWebsite ?? null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };
    });

    const pageNumber = parsed.data.pageNumber ?? 1;
    const pageSizeResult = parsed.data.pageSize ?? pageSize;
    const totalCount = parsed.data.totalCount ?? 0;
    const hasMore = page * pageSizeResult < totalCount;
    const nextCursor = hasMore ? String(page + 1) : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }
}
