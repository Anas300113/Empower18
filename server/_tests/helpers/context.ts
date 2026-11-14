/**
 * QA-owned context builder for tRPC caller tests.
 * Mirrors TrpcContext shape from server/_core/context.ts without touching it.
 */
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { TrpcContext } from "../../_core/context";
import type { User } from "../../../drizzle/schema";
import type { AuthenticatedUser } from "../../_core/context";

type HeadersInitLike = Record<string, string>;

export function makeRequest(overrides: {
  cookie?: string;
  authorization?: string;
  path?: string;
} = {}): CreateExpressContextOptions["req"] {
  const headers: HeadersInitLike = {};
  if (overrides.cookie !== undefined) headers.cookie = overrides.cookie;
  if (overrides.authorization !== undefined)
    headers.authorization = overrides.authorization;
  return {
    headers,
    path: overrides.path ?? "/",
    query: {},
  } as unknown as CreateExpressContextOptions["req"];
}

export function makeResponse(
  cleared: { name: string; options: Record<string, unknown> }[] = []
): CreateExpressContextOptions["res"] {
  return {
    clearCookie: (name: string, options: Record<string, unknown>) => {
      cleared.push({ name, options });
    },
  } as unknown as CreateExpressContextOptions["res"];
}

export function makeContext(
  user: AuthenticatedUser | null,
  req: CreateExpressContextOptions["req"] = makeRequest(),
  res: CreateExpressContextOptions["res"] = makeResponse()
): TrpcContext {
  return {
    user,
    req,
    res,
  };
}
