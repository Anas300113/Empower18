// ─────────────────────────────────────────────────────────────────────────────
// Connector Registry
//
// Registers all available opportunity connectors. Connectors are instantiated
// lazily when needed, with API keys resolved from server-side environment
// variables only.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ConnectorRegistration,
  OpportunityConnector,
} from "./base";
import { GreenhouseConnector } from "./greenhouse";
import { AshbyConnector } from "./ashby";
import { LeverConnector } from "./lever";
import { GovUkConnector } from "./govuk";

const registrations: ConnectorRegistration[] = [
  {
    id: "greenhouse",
    providerName: "Greenhouse Job Board",
    providerHost: "boards.greenhouse.io",
    capabilities: {
      supportsPagination: true,
      supportsRateLimitHeaders: true,
      requiresAuth: false,
    },
    rateLimit: {
      requestsPerMinute: 60,
    },
    createConnector: (apiKey?: string) => new GreenhouseConnector(apiKey),
  },
  {
    id: "ashby",
    providerName: "Ashby Public Job Postings",
    providerHost: "api.ashbyhq.com",
    capabilities: {
      supportsPagination: true,
      supportsRateLimitHeaders: false,
      requiresAuth: true,
    },
    rateLimit: {
      requestsPerMinute: 100,
    },
    createConnector: (apiKey?: string) => new AshbyConnector(apiKey),
  },
  {
    id: "lever",
    providerName: "Lever Postings",
    providerHost: "api.lever.co",
    capabilities: {
      supportsPagination: true,
      supportsRateLimitHeaders: false,
      requiresAuth: false,
    },
    rateLimit: {
      requestsPerMinute: 100,
    },
    createConnector: (apiKey?: string) => new LeverConnector(apiKey),
  },
  {
    id: "govuk",
    providerName: "GOV.UK Find an Apprenticeship",
    providerHost: "findapprenticeshiptraining.sfa.bis.gov.uk",
    capabilities: {
      supportsPagination: true,
      supportsRateLimitHeaders: false,
      requiresAuth: false,
    },
    rateLimit: {
      requestsPerMinute: 30,
    },
    createConnector: () => new GovUkConnector(),
  },
];

/** Get all registered connectors */
export function listConnectors(): ConnectorRegistration[] {
  return registrations;
}

/** Get a connector registration by id */
export function getConnector(id: string): ConnectorRegistration | undefined {
  return registrations.find(r => r.id === id);
}

/** Create a connector instance by id */
export function createConnector(
  id: string,
  apiKey?: string
): OpportunityConnector | undefined {
  const registration = getConnector(id);
  if (!registration) return undefined;
  return registration.createConnector(apiKey);
}

/** Resolve the API key for a connector from environment variables */
export function resolveApiKey(connectorId: string): string | undefined {
  switch (connectorId) {
    case "greenhouse":
      return process.env.GREENHOUSE_API_KEY;
    case "ashby":
      return process.env.ASHBY_API_KEY;
    case "lever":
      return process.env.LEVER_API_KEY;
    case "govuk":
      return undefined;
    default:
      return undefined;
  }
}