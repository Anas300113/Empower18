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
          adverts: [],
          totalCount: 0,
          pageNumber: 1,
          pageSize: 50,
        })
      )
    );
    vi.stubGlobal("fetch", request);

    await new GovUkConnector({ apiKey: "test-key" }).fetchOpportunities();

    expect(request.mock.calls[0][1].headers).toMatchObject({
      "Ocp-Apim-Subscription-Key": "test-key",
      "X-Version": "2",
    });
  });
});
