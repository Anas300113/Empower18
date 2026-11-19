import { createApp, toWebHandler } from "nitro/h3";
import { describe, expect, it } from "vitest";

import healthHandler from "../../routes/api/health.get";
import platformConfigHandler from "../../routes/api/platform/config.js";
import trpcHandler from "../../routes/api/trpc/[...]";

function createApiFetch() {
  const app = createApp();
  app.use("/api/health", healthHandler);
  app.use("/api/platform/config.js", platformConfigHandler);
  app.use("/api/trpc/**", trpcHandler);
  return toWebHandler(app);
}

describe("Nitro API routes", () => {
  it("returns the health status without database access", async () => {
    const response = await createApiFetch()(
      new Request("http://local/api/health")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("serves the public-only runtime config script", async () => {
    const response = await createApiFetch()(
      new Request("http://local/api/platform/config.js")
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/javascript"
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toContain("window.__MANUS_CONFIG__=");
    expect(body).not.toContain("DATABASE_URL");
    expect(body).not.toContain("OPPORTUNITY_EXPIRY_SECRET");
  });

  it("serves the existing public tRPC router through the Fetch adapter", async () => {
    const response = await createApiFetch()(
      new Request("http://local/api/trpc/auth.me")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.result.data.json).toBeNull();
  });

  it("clears the retired session cookie when the tRPC logout procedure is called", async () => {
    const response = await createApiFetch()(
      new Request("http://local/api/trpc/auth.logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("keeps protected tRPC procedures unauthorized without a Supabase token", async () => {
    const response = await createApiFetch()(
      new Request("http://local/api/trpc/admin.dashboard")
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
