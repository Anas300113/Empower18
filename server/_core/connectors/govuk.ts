import type {
  CanonicalOpportunity,
  ConnectorConfig,
  OpportunityConnector,
  SyncOptions,
} from "./base";
import { z } from "zod";

const dateValue = z.string().datetime({ offset: true }).nullable().optional();
const amountValue = z.union([z.number(), z.string()]).nullable().optional();
const govukVacancySchema = z.object({
  vacancyReference: z.string(),
  title: z.string(),
  fullDescription: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  vacancyUrl: z.string().url().nullable().optional(),
  applicationUrl: z.string().url().nullable().optional(),
  employerName: z.string().nullable().optional(),
  employerWebsiteUrl: z.string().url().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  addressLine3: z.string().nullable().optional(),
  addressLine4: z.string().nullable().optional(),
  postcode: z.string().nullable().optional(),
  wageAmount: amountValue,
  wageUnit: z.string().nullable().optional(),
  wageAdditionalInformation: z.string().nullable().optional(),
  closingDate: dateValue,
  startDate: dateValue,
  apprenticeshipLevel: z.string().nullable().optional(),
  workingWeekDescription: z.string().nullable().optional(),
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
      const location =
        [
          vacancy.addressLine1,
          vacancy.addressLine2,
          vacancy.addressLine3,
          vacancy.addressLine4,
          vacancy.postcode,
        ]
          .filter(Boolean)
          .join(", ") || null;
      const description = stripHtml(
        vacancy.fullDescription ?? vacancy.description ?? ""
      );
      const amount =
        vacancy.wageAmount == null ? null : Number(vacancy.wageAmount);
      const compensationText =
        [
          vacancy.wageAmount,
          vacancy.wageUnit,
          vacancy.wageAdditionalInformation,
          vacancy.workingWeekDescription,
        ]
          .filter(Boolean)
          .join(" ") || null;
      return {
        sourceRecordId: vacancy.vacancyReference,
        canonicalUrl:
          vacancy.vacancyUrl ??
          `https://www.findapprenticeship.service.gov.uk/apprenticeship/${vacancy.vacancyReference}`,
        externalApplicationUrl: vacancy.applicationUrl ?? undefined,
        title: vacancy.title,
        description,
        summary: description.slice(0, 500) || null,
        type: "apprenticeship",
        category: null,
        route: "Apprenticeship",
        location,
        district: vacancy.addressLine4 ?? null,
        deliveryMethod: null,
        isRemoteEligible: false,
        minAge: null,
        maxAge: null,
        educationRequirements: null,
        qualificationRequirements: vacancy.apprenticeshipLevel ?? null,
        requiredSkills: [],
        salaryMin: Number.isFinite(amount) ? amount : null,
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
