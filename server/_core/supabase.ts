import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

let _supabase: SupabaseClient | null = null;

/**
 * Returns a Supabase admin client configured with the service-role key.
 *
 * The service-role key bypasses Row Level Security (RLS) and must ONLY be used
 * in trusted server-side environments. It is never exposed to the browser.
 *
 * For user-scoped operations, use `verifySupabaseToken()` + `supabase.auth`
 * with the user's JWT, or enforce ownership checks in application logic.
 */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!ENV.supabaseUrl) {
      throw new Error("SUPABASE_URL is not configured");
    }
    if (!ENV.supabaseServiceKey) {
      throw new Error("SUPABASE_SECRET_KEY is not configured");
    }
    _supabase = createClient(ENV.supabaseUrl, ENV.supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return _supabase;
}

/**
 * Verifies a Supabase Auth JWT and returns the authenticated user record.
 *
 * This calls `supabase.auth.getUser(token)` which validates the JWT signature,
 * issuer, expiration, and claims against Supabase Auth. It is the official
 * server-side pattern for verifying Supabase Auth tokens.
 *
 * Returns null if the token is invalid, expired, or the user does not exist.
 */
export async function verifySupabaseToken(
  token: string
): Promise<{
  id: string;
  email: string | null;
  name: string | null;
  rawUserMetaData: Record<string, unknown> | null;
} | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email ?? null,
      name: data.user.user_metadata?.name ?? data.user.email?.split("@")[0] ?? null,
      rawUserMetaData: data.user.user_metadata ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Creates a Supabase client scoped to a specific user's access token.
 *
 * This client respects Row Level Security (RLS) policies because it uses
 * the user's own JWT. Use this for any database operations that should
 * be constrained by RLS.
 *
 * @param accessToken - The user's Supabase access token (JWT)
 */
export function createSupabaseUserClient(accessToken: string): SupabaseClient {
  if (!ENV.supabaseUrl) {
    throw new Error("SUPABASE_URL is not configured");
  }
  if (!ENV.supabasePublishableKey) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY is not configured");
  }

  return createClient(ENV.supabaseUrl, ENV.supabasePublishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
