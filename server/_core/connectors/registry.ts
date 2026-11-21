// ─────────────────────────────────────────────────────────────────────────────
// Connector Registry
//
// Registers all available opportunity connectors. Connectors are instantiated
// lazily, with public board identifiers and server-only credentials resolved
// separately from environment variables.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ConnectorConfig,
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
    providerHost: "boards-api.greenhouse.io",
    capabilities: {
      supportsPagination: true,
      supportsRateLimitHeaders: true,
      requiresAuth: false,
    },
    rateLimit: { requestsPerMinute: 60 },
    createConnector: (config?: ConnectorConfig) =>
      new GreenhouseConnector(config),
  },
  {
    id: "ashby",
    providerName: "Ashby Public Job Postings",
    providerHost: "api.ashbyhq.com",
    capabilities: {
      supportsPagination: false,
      supportsRateLimitHeaders: false,
      requiresAuth: false,
    },
    rateLimit: { requestsPerMinute: 100 },
    createConnector: (config?: ConnectorConfig) => new AshbyConnector(config),
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
    rateLimit: { requestsPerMinute: 100 },
    createConnector: (config?: ConnectorConfig) => new LeverConnector(config),
  },
  {
    id: "govuk",
    providerName: "GOV.UK Find an Apprenticeship",
    providerHost: "api.apprenticeships.education.gov.uk",
    capabilities: {
      supportsPagination: true,
      supportsRateLimitHeaders: false,
      requiresAuth: true,
    },
    rateLimit: { requestsPerMinute: 30 },
    createConnector: (config?: ConnectorConfig) => new GovUkConnector(config),
  },
];

export function listConnectors(): ConnectorRegistration[] {
  return registrations;
}

export function getConnector(id: string): ConnectorRegistration | undefined {
  return registrations.find(registration => registration.id === id);
}

export function createConnector(
  id: string,
  config?: ConnectorConfig
): OpportunityConnector | undefined {
  const registration = getConnector(id);
  if (!registration) return undefined;
  return registration.createConnector(config);
}

/** Resolve public identifiers and server-only credentials from environment variables. */
export function resolveConnectorConfig(connectorId: string): ConnectorConfig {
  switch (connectorId) {
    case "greenhouse":
      return { boardToken: process.env.GREENHOUSE_BOARD_TOKEN };
    case "ashby":
      return { boardName: process.env.ASHBY_BOARD_NAME };
    case "lever":
      return { company: process.env.LEVER_COMPANY };
    case "govuk":
      return { apiKey: process.env.GOVUK_API_KEY };
    default:
      return {};
  }
}

/** Backwards-compatible resolver for callers that only need a secret credential. */
export function resolveApiKey(connectorId: string): string | undefined {
  return resolveConnectorConfig(connectorId).apiKey;
}
