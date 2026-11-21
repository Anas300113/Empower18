import { createApp, toWebHandler } from "nitro/h3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserRoles: vi.fn(),
  expireDueOpportunities: vi.fn(),
  syncActiveOpportunitySources: vi.fn(),
}));

vi.mock("../db/profile", () => ({ getUserRoles: mocks.getUserRoles }));
vi.mock("../db/opportunities", () => ({
  expireDueOpportunities: mocks.expireDueOpportunities,
}));
vi.mock("./connectors/ingestion", () => ({
  syncActiveOpportunitySources: mocks.syncActiveOpportunitySources,
}));

import handler from "../../routes/api/maintenance/opportunities/expire";
import syncHandler from "../../routes/api/maintenance/opportunities/sync";

const SECRET = "test-maintenance-secret-that-is-at-least-32-chars";
const ACTOR_ID = "00000000-1111-2222-3333-000000000999";
const ROUTE = "/api/maintenance/opportunities/expire";

function createRouteFetch(route: string, routeHandler: typeof handler) {
  const app = createApp();
  app.use(route, routeHandler);
  return toWebHandler(app);
}

beforeEach(() => {
  vi.stubEnv("OPPORTUNITY_EXPIRY_SECRET", SECRET);
  vi.stubEnv("OPPORTUNITY_EXPIRY_ACTOR_USER_ID", ACTOR_ID);
  vi.stubEnv("OPPORTUNITY_SYNC_SECRET", SECRET);
  vi.stubEnv("DATABASE_URL", "postgresql://test-only.invalid/empower18");
  mocks.getUserRoles.mockReset();
  mocks.expireDueOpportunities.mockReset();
  mocks.syncActiveOpportunitySources.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Nitro/Vercel opportunity-expiry route", () => {
  it("rejects non-POST requests", async () => {
    const response = await createRouteFetch(
      ROUTE,
      handler
    )(new Request(`http://local${ROUTE}`));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.getUserRoles).not.toHaveBeenCalled();
  });

  it("rejects invalid bearer credentials without accessing the database", async () => {
    const response = await createRouteFetch(
      ROUTE,
      handler
    )(
      new Request(`http://local${ROUTE}`, {
        method: "POST",
        headers: { Authorization: "Bearer wrong-secret" },
      })
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.getUserRoles).not.toHaveBeenCalled();
    expect(mocks.expireDueOpportunities).not.toHaveBeenCalled();
  });

  it("expires listings as the configured administrator", async () => {
    mocks.getUserRoles.mockResolvedValue(["admin"]);
    mocks.expireDueOpportunities.mockResolvedValue([
      { id: "expired-1" },
      { id: "expired-2" },
    ]);
    const response = await createRouteFetch(
      ROUTE,
      handler
    )(
      new Request(`http://local${ROUTE}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SECRET}` },
      })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ expiredCount: 2 });
    expect(mocks.getUserRoles).toHaveBeenCalledWith(ACTOR_ID);
    expect(mocks.expireDueOpportunities).toHaveBeenCalledWith(ACTOR_ID);
  });
});

describe("Nitro/Vercel opportunity-sync route", () => {
  const route = "/api/maintenance/opportunities/sync";

  it("rejects non-POST requests", async () => {
    const response = await createRouteFetch(
      route,
      syncHandler
    )(new Request(`http://local${route}`));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });

  it("returns a non-success status when a source fails", async () => {
    mocks.syncActiveOpportunitySources.mockResolvedValue([
      { sourceId: "source-1", status: "failed" },
    ]);
    const response = await createRouteFetch(
      route,
      syncHandler
    )(
      new Request(`http://local${route}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SECRET}` },
      })
    );
    expect(response.status).toBe(502);
    expect(mocks.syncActiveOpportunitySources).toHaveBeenCalled();
  });
});
