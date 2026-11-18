import { createHash, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { getUserRoles } from "../db/profile";
import { expireDueOpportunities } from "../db/opportunities";

function matchesSecret(candidate: string, expected: string): boolean {
  const candidateDigest = createHash("sha256").update(candidate).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}

/**
 * Registers a server-only maintenance endpoint for the external scheduler.
 * It is unavailable unless a strong secret and an existing admin actor UUID
 * are configured. It never accepts an actor identity from the request body.
 */
export function registerMaintenanceRoutes(app: Express): void {
  app.post(
    "/api/maintenance/opportunities/expire",
    async (req: Request, res: Response) => {
      const expectedSecret = process.env.OPPORTUNITY_EXPIRY_SECRET;
      const actorUserId = process.env.OPPORTUNITY_EXPIRY_ACTOR_USER_ID;
      if (!expectedSecret || expectedSecret.length < 32 || !actorUserId) {
        res
          .status(503)
          .json({ error: "Maintenance endpoint is not configured" });
        return;
      }

      const authorization = req.header("authorization") ?? "";
      const match = /^Bearer\s+(.+)$/i.exec(authorization);
      if (!match || !matchesSecret(match[1], expectedSecret)) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      try {
        const roles = await getUserRoles(actorUserId);
        if (!roles.includes("admin")) {
          res.status(503).json({
            error: "Configured maintenance actor is not an administrator",
          });
          return;
        }

        const expired = await expireDueOpportunities(actorUserId);
        res.status(200).json({ expiredCount: expired.length });
      } catch (error) {
        console.error("Opportunity expiry maintenance failed", error);
        res.status(500).json({ error: "Opportunity expiry failed" });
      }
    }
  );
}
