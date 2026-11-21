import { createHash, timingSafeEqual } from "node:crypto";
import { getUserRoles } from "../db/profile";
import { expireDueOpportunities } from "../db/opportunities";
import { syncActiveOpportunitySources } from "./connectors/ingestion";

type MaintenanceRequest = { header(name: string): string | undefined };
type MaintenanceResponse = {
  status(code: number): MaintenanceResponse;
  json(body: MaintenanceResult["body"]): unknown;
};
type MaintenanceRouteRegistrar = {
  post(
    path: string,
    handler: (
      request: MaintenanceRequest,
      response: MaintenanceResponse
    ) => void | Promise<void>
  ): unknown;
};

export type MaintenanceResult = {
  status: number;
  body:
    | { error: string }
    | { expiredCount: number }
    | { syncResults: unknown[] };
};

function matchesSecret(candidate: string, expected: string): boolean {
  const candidateDigest = createHash("sha256").update(candidate).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}

/**
 * Performs the protected expiry operation, shared by Express and Vercel.
 * It never accepts an actor identity from the request.
 */
export async function handleOpportunityExpiry(
  authorization: string | undefined
): Promise<MaintenanceResult> {
  const expectedSecret = process.env.OPPORTUNITY_EXPIRY_SECRET;
  const actorUserId = process.env.OPPORTUNITY_EXPIRY_ACTOR_USER_ID;
  if (!expectedSecret || expectedSecret.length < 32 || !actorUserId) {
    return {
      status: 503,
      body: { error: "Maintenance endpoint is not configured" },
    };
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? "");
  if (!match || !matchesSecret(match[1], expectedSecret)) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  if (!process.env.DATABASE_URL) {
    return {
      status: 503,
      body: { error: "Maintenance database is not configured" },
    };
  }

  try {
    const roles = await getUserRoles(actorUserId);
    if (!roles.includes("admin")) {
      return {
        status: 503,
        body: { error: "Configured maintenance actor is not an administrator" },
      };
    }

    const expired = await expireDueOpportunities(actorUserId);
    return { status: 200, body: { expiredCount: expired.length } };
  } catch (error) {
    console.error("Opportunity expiry maintenance failed", error);
    return { status: 500, body: { error: "Opportunity expiry failed" } };
  }
}

/** Registers the maintenance operation on the long-running Express server. */
export function registerMaintenanceRoutes(
  app: MaintenanceRouteRegistrar
): void {
  app.post(
    "/api/maintenance/opportunities/expire",
    async (request, response) => {
      const result = await handleOpportunityExpiry(
        request.header("authorization")
      );
      response.status(result.status).json(result.body);
    }
  );
  app.post("/api/maintenance/opportunities/sync", async (request, response) => {
    const result = await handleOpportunitySync(request.header("authorization"));
    response.status(result.status).json(result.body);
  });
}

export async function handleOpportunitySync(
  authorization: string | undefined
): Promise<MaintenanceResult> {
  const expectedSecret = process.env.OPPORTUNITY_SYNC_SECRET;
  if (!expectedSecret || expectedSecret.length < 32)
    return { status: 503, body: { error: "Sync endpoint is not configured" } };
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? "");
  if (!match || !matchesSecret(match[1], expectedSecret))
    return { status: 401, body: { error: "Unauthorized" } };
  if (!process.env.DATABASE_URL)
    return {
      status: 503,
      body: { error: "Maintenance database is not configured" },
    };
  try {
    const syncResults = await syncActiveOpportunitySources({
      maxPages: Number(process.env.OPPORTUNITY_SYNC_MAX_PAGES ?? 100),
    });
    const failed = syncResults.some(result => result.status === "failed");
    return {
      status: syncResults.length === 0 ? 503 : failed ? 502 : 200,
      body: { syncResults },
    };
  } catch (error) {
    console.error("Opportunity ingestion maintenance failed", error);
    return { status: 500, body: { error: "Opportunity sync failed" } };
  }
}
