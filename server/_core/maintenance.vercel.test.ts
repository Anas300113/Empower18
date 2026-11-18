import { createApp, toWebHandler } from "nitro/h3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserRoles: vi.fn(),
  expireDueOpportunities: vi.fn(),
}));

vi.mock("../db/profile", () => ({ getUserRoles: mocks.getUserRoles }));
vi.mock("../db/opportunities", () => ({
  expireDueOpportunities: mocks.expireDueOpportunities,
}));

import handler from "../../api/maintenance/opportunities/expire";

const SECRET = "test-maintenance-secret-that-is-at-least-32-chars";
const ACTOR_ID = "00000000-1111-2222-3333-000000000999";
const ROUTE = "/api/maintenance/opportunities/expire";

function createRouteFetch() {
  const app = createApp();
  app.use(ROUTE, handler);
  return toWebHandler(app);
}

beforeEach(() => {
  vi.stubEnv("OPPORTUNITY_EXPIRY_SECRET", SECRET);
  vi.stubEnv("OPPORTUNITY_EXPIRY_ACTOR_USER_ID", ACTOR_ID);
  vi.stubEnv("DATABASE_URL", "postgresql://test-only.invalid/empower18");
  mocks.getUserRoles.mockReset();
  mocks.expireDueOpportunities.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Nitro/Vercel opportunity-expiry route", () => {
  it("rejects non-POST requests", async () => {
    const routeFetch = createRouteFetch();
    const response = await routeFetch(new Request(`http://local${ROUTE}`));

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.getUserRoles).not.toHaveBeenCalled();
  });

  it("rejects invalid bearer credentials without accessing the database", async () => {
    const routeFetch = createRouteFetch();
    const response = await routeFetch(
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
    const routeFetch = createRouteFetch();
    const response = await routeFetch(
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
