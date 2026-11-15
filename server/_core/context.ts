import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifySupabaseToken } from "./supabase";
import { ensureStudentRole, getUserRoles } from "../db/profile";

/**
 * Strongly typed authenticated user.
 *
 * The `id` is a Supabase Auth UUID (string), not a numeric ID.
 * Roles are fetched server-side from the database and NEVER trusted
 * from JWT claims or browser-supplied data.
 */
export type AuthenticatedUser = {
  id: string;
  email: string | null;
  name: string | null;
  roles: string[];
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AuthenticatedUser | null;
};

/**
 * Extracts the Supabase access token from the Authorization header.
 *
 * Accepts "Bearer <token>" format. Returns null if no valid token is found.
 */
function extractAccessToken(req: CreateExpressContextOptions["req"]): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== "string") return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") return null;

  const token = parts[1];
  return token.length > 0 ? token : null;
}

export async function createContext(
  opts: Pick<CreateExpressContextOptions, "req" | "res">
): Promise<TrpcContext> {
  let user: AuthenticatedUser | null = null;

  try {
    const accessToken = extractAccessToken(opts.req);
    if (!accessToken) {
      // No token provided; authentication is optional for public procedures.
      return { req: opts.req, res: opts.res, user: null };
    }

    // Verify the Supabase JWT server-side.
    const verifiedUser = await verifySupabaseToken(accessToken);
    if (!verifiedUser) {
      // Token invalid, expired, or user does not exist.
      return { req: opts.req, res: opts.res, user: null };
    }

    // Fetch roles from the database (trusted server-side data).
    // Never trust roles supplied by the browser or JWT claims.
    let roles = await getUserRoles(verifiedUser.id);
    // A newly registered participant has no application role yet. Provision
    // the default student role during authentication, before protected
    // onboarding mutations can run. Existing admin/employer roles are never
    // overwritten or downgraded.
    if (roles.length === 0) {
      const provisioned = await ensureStudentRole(verifiedUser.id);
      if (provisioned) roles = ["student"];
    }

    user = {
      id: verifiedUser.id,
      email: verifiedUser.email,
      name: verifiedUser.name,
      roles,
    };
  } catch {
    // Authentication failed; user remains null.
    // Public procedures can still execute; protected procedures will throw.
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
