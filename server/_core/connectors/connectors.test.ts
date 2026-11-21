import { afterEach, describe, expect, it, vi } from "vitest";
import { AshbyConnector } from "./ashby";
import { GovUkConnector } from "./govuk";
import { GreenhouseConnector } from "./greenhouse";
import { LeverConnector } from "./lever";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("opportunity connector API contracts", () => {
  it("requires explicit public identifiers for board connectors", () => {
    expect(() => new GreenhouseConnector({})).toThrow("GREENHOUSE_BOARD_TOKEN");
    expect(() => new AshbyConnector({})).toThrow("ASHBY_BOARD_NAME");
    expect(() => new LeverConnector({})).toThrow("LEVER_COMPANY");
    expect(() => new GovUkConnector({})).toThrow("GOVUK_API_KEY");
  });

  it("filters unlisted Ashby jobs and uses the public GET contract", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          jobs: [
            {
              title: "Listed apprentice",
              jobUrl: "https://jobs.example/listed",
              isListed: true,
              publishedAt: "2021-04-30T16:21:55.393+00:00",
              isRemote: true,
              workplaceType: "Hybrid",
              descriptionPlain: "A listed role",
            },
            {
              title: "Hidden role",
              jobUrl: "https://jobs.example/hidden",
              isListed: false,
            },
          ],
        })
      )
    );
    vi.stubGlobal("fetch", request);

    const result = await new AshbyConnector({
      boardName: "example",
    }).fetchOpportunities();

    expect(result.items).toHaveLength(1);
    expect(result.items[0].canonicalUrl).toBe("https://jobs.example/listed");
    expect(result.items[0].isRemoteEligible).toBe(false);
    expect(result.items[0].deliveryMethod).toBe("Hybrid");
    expect(request.mock.calls[0][0]).toBe(
      "https://api.ashbyhq.com/posting-api/job-board/example?includeCompensation=false"
    );
  });

  it("uses Lever skip and limit pagination", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "lever-1",
            text: "Role",
            title: "Apprentice",
            descriptionPlain: "Description",
            description: null,
            categories: null,
            location: null,
            applyUrl: "https://jobs.example/apply",
            updatedAt: null,
            createdAt: null,
          },
        ])
      )
    );
    vi.stubGlobal("fetch", request);

    const result = await new LeverConnector({
      company: "example",
    }).fetchOpportunities({
      sourceId: "source-test",
      cursor: "50",
      pageSize: 1,
    });

    const url = new URL(request.mock.calls[0][0]);
    expect(url.searchParams.get("skip")).toBe("50");
    expect(url.searchParams.get("limit")).toBe("1");
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe("51");
  });

  it("sends GOV.UK API v2 authentication and version headers", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          vacancies: [
            {
              vacancyReference: "UK-123",
              title: "Engineering apprentice",
              fullDescription: "<p>Full advert description</p>",
              vacancyUrl:
                "https://www.findapprenticeship.service.gov.uk/v/UK-123",
              applicationUrl: "https://apply.example/UK-123",
              employerName: "Example Engineering",
              employerWebsiteUrl: "https://example.org",
              addressLine1: "1 High Street",
              addressLine4: "Warwickshire",
              postcode: "CV1 1AA",
              wageAmount: 18000,
              wageUnit: "Annually",
              wageAdditionalInformation: "Plus benefits",
              apprenticeshipLevel: "Level 3",
              workingWeekDescription: "Monday to Friday",
            },
          ],
          total: 1,
          totalFiltered: 1,
          totalPages: 1,
        })
      )
    );
    vi.stubGlobal("fetch", request);

    const result = await new GovUkConnector({
      apiKey: "test-key",
    }).fetchOpportunities();

    expect(String(request.mock.calls[0][0])).toContain("/vacancies/vacancy");
    expect(request.mock.calls[0][1].headers).toMatchObject({
      "Ocp-Apim-Subscription-Key": "test-key",
      "X-Version": "2",
    });
    expect(result.items[0]).toMatchObject({
      sourceRecordId: "UK-123",
      canonicalUrl: "https://www.findapprenticeship.service.gov.uk/v/UK-123",
      externalApplicationUrl: "https://apply.example/UK-123",
      organisationName: "Example Engineering",
      qualificationRequirements: "Level 3",
    });
    expect(result.items[0].description).toBe("Full advert description");
    expect(result.items[0].compensationText).toContain("Plus benefits");
  });
});
