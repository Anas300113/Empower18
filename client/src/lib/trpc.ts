import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";
import { supabase } from "@/_core/supabase";

export const trpc = createTRPCReact<AppRouter>();

export type { AppRouter };

/**
 * Get the current Supabase access token for tRPC requests.
 * Returns null if no session exists.
 */
export async function getSupabaseAccessToken(): Promise<string | null> {
  try {
    const { data: session } = await supabase.auth.getSession();
    return (session as any)?.access_token ?? null;
  } catch {
    return null;
  }
}
