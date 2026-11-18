import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

const mocks = vi.hoisted(() => ({
  getUserRoles: vi.fn(),
  expireDueOpportunities: vi.fn(),
}));

vi.mock("../db/profile", () => ({ getUserRoles: mocks.getUserRoles }));
vi.mock("../db/opportunities", () => ({
  expireDueOpportunities: mocks.expireDueOpportunities,
}));

import { registerMaintenanceRoutes } from "./maintenance";

const SECRET = "test-maintenance-secret-that-is-at-least-32-chars";
const ACTOR_ID = "00000000-1111-2222-3333-000000000999";

async function startTestServer(): Promise<{
  server: Server;
  url: string;
}> {
  const app = express();
  app.use(express.json());
  registerMaintenanceRoutes(app);
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${address.port}` };
}

async function stopTestServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve()))
  );
}

beforeEach(() => {
  vi.stubEnv("OPPORTUNITY_EXPIRY_SECRET", SECRET);
  vi.stubEnv("OPPORTUNITY_EXPIRY_ACTOR_USER_ID", ACTOR_ID);
  mocks.getUserRoles.mockReset();
  mocks.expireDueOpportunities.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Opportunity expiry maintenance endpoint", () => {
  it("fails closed when the server secret is not configured", async () => {
    vi.stubEnv("OPPORTUNITY_EXPIRY_SECRET", "");
    const { server, url } = await startTestServer();
    try {
      const response = await fetch(
        `${url}/api/maintenance/opportunities/expire`,
        {
          method: "POST",
        }
      );
      expect(response.status).toBe(503);
      expect(mocks.expireDueOpportunities).not.toHaveBeenCalled();
    } finally {
      await stopTestServer(server);
    }
  });

  it("rejects an invalid bearer secret before database access", async () => {
    const { server, url } = await startTestServer();
    try {
      const response = await fetch(
        `${url}/api/maintenance/opportunities/expire`,
        {
          method: "POST",
          headers: { Authorization: "Bearer wrong-secret" },
        }
      );
      expect(response.status).toBe(401);
      expect(mocks.getUserRoles).not.toHaveBeenCalled();
      expect(mocks.expireDueOpportunities).not.toHaveBeenCalled();
    } finally {
      await stopTestServer(server);
    }
  });

  it("requires the configured actor to have an admin role", async () => {
    mocks.getUserRoles.mockResolvedValue(["student"]);
    const { server, url } = await startTestServer();
    try {
      const response = await fetch(
        `${url}/api/maintenance/opportunities/expire`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${SECRET}` },
        }
      );
      expect(response.status).toBe(503);
      expect(mocks.getUserRoles).toHaveBeenCalledWith(ACTOR_ID);
      expect(mocks.expireDueOpportunities).not.toHaveBeenCalled();
    } finally {
      await stopTestServer(server);
    }
  });

  it("expires listings as the verified admin actor and returns a count", async () => {
    mocks.getUserRoles.mockResolvedValue(["admin"]);
    mocks.expireDueOpportunities.mockResolvedValue([{ id: "expired-1" }]);
    const { server, url } = await startTestServer();
    try {
      const response = await fetch(
        `${url}/api/maintenance/opportunities/expire`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${SECRET}` },
        }
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ expiredCount: 1 });
      expect(mocks.expireDueOpportunities).toHaveBeenCalledWith(ACTOR_ID);
    } finally {
      await stopTestServer(server);
    }
  });
});
