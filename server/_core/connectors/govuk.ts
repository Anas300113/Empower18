// ─────────────────────────────────────────────────────────────────────────────
// GOV.UK Find an Apprenticeship Display Advert Connector (API v2)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CanonicalOpportunity,
  ConnectorConfig,
  OpportunityConnector,
  SyncOptions,
} from "./base";
import { z } from "zod";

const dateValue = z.string().datetime({ offset: true }).nullable().optional();
const govukAddressSchema = z.object({
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  town: z.string().nullable().optional(),
  county: z.string().nullable().optional(),
  postcode: z.string().nullable().optional(),
});
const govukWageSchema = z.object({
  amount: z.number().nullable().optional(),
  amountText: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
});
const govukVacancySchema = z.object({
  vacancyReference: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  employerName: z.string().nullable().optional(),
  employerWebsiteUrl: z.string().url().nullable().optional(),
  addresses: z.array(govukAddressSchema).optional(),
  wage: govukWageSchema.nullable().optional(),
  closingDate: dateValue,
  startDate: dateValue,
  level: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
});
const govukResponseSchema = z.object({
  vacancies: z.array(govukVacancySchema),
  total: z.number().optional(),
  totalFiltered: z.number().optional(),
  totalPages: z.number().optional(),
});

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
  readonly providerHost = "api.apprenticeships.education.gov.uk";
  readonly capabilities = {
    supportsPagination: true,
    supportsRateLimitHeaders: false,
    requiresAuth: true,
  };
  readonly rateLimit = { requestsPerMinute: 30 };
  private readonly apiKey: string;

  constructor(config?: ConnectorConfig) {
    this.apiKey = config?.apiKey ?? process.env.GOVUK_API_KEY ?? "";
    if (!this.apiKey)
      throw new Error(
        "GOV.UK connector requires GOVUK_API_KEY environment variable"
      );
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

  async fetchOpportunities(options?: SyncOptions) {
    const page = Number(options?.cursor ?? "1") || 1;
    const pageSize = options?.pageSize ?? 50;
    const url = new URL(
      "https://api.apprenticeships.education.gov.uk/vacancies/vacancy"
    );
    url.searchParams.set("PageNumber", String(page));
    url.searchParams.set("PageSize", String(pageSize));
    url.searchParams.set("IncludeDetails", "true");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Ocp-Apim-Subscription-Key": this.apiKey,
        "X-Version": "2",
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

    const parsed = govukResponseSchema.safeParse(await response.json());
    if (!parsed.success)
      throw new Error(
        `GOV.UK API response validation failed: ${parsed.error.message}`
      );

    const items: CanonicalOpportunity[] = parsed.data.vacancies.map(vacancy => {
      const address = vacancy.addresses?.[0];
      const location =
        [address?.town, address?.county, address?.postcode]
          .filter(Boolean)
          .join(", ") || null;
      const description = stripHtml(vacancy.description ?? "");
      const wage = vacancy.wage;
      const compensationText = wage
        ? [
            wage.amountText,
            wage.amount != null ? String(wage.amount) : null,
            wage.unit,
          ]
            .filter(Boolean)
            .join(" ") || null
        : null;
      return {
        sourceRecordId: vacancy.vacancyReference,
        canonicalUrl: `https://www.findapprenticeship.service.gov.uk/apprenticeship/${vacancy.vacancyReference}`,
        title: vacancy.title,
        description,
        summary: description.slice(0, 500) || null,
        type: "apprenticeship",
        category: null,
        route: "Apprenticeship",
        location,
        district: address?.county ?? null,
        deliveryMethod: null,
        isRemoteEligible: false,
        minAge: null,
        maxAge: null,
        educationRequirements: null,
        qualificationRequirements: vacancy.level ?? null,
        requiredSkills: [],
        salaryMin: wage?.amount ?? null,
        salaryMax: null,
        compensationText,
        applicationOpensAt: null,
        applicationDeadlineAt: vacancy.closingDate
          ? new Date(vacancy.closingDate)
          : null,
        startDateAt: vacancy.startDate ? new Date(vacancy.startDate) : null,
        expiresAt: vacancy.closingDate ? new Date(vacancy.closingDate) : null,
        applicationInstructions: null,
        organisationName: vacancy.employerName ?? null,
        organisationWebsite: vacancy.employerWebsiteUrl ?? null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };
    });
    const totalPages =
      parsed.data.totalPages ?? (items.length < pageSize ? page : page + 1);
    const hasMore = page < totalPages;
    return { items, nextCursor: hasMore ? String(page + 1) : null, hasMore };
  }
}
