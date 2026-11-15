import { onAuthStateChange, getSession, signOut as supabaseSignOut, type Session, type User } from "@/_core/auth";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const profileQuery = trpc.profile.me.useQuery(undefined, {
    enabled: Boolean(session),
    retry: false,
  });

  // Restore session on mount and listen for auth state changes.
  useEffect(() => {
    let mounted = true;

    getSession().then((result) => {
      if (!mounted) return;
      if (result.ok) {
        setSession(result.data);
      }
      setLoading(false);
    });

    const unsubscribe = onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabaseSignOut();
    } catch {
      // Ignore logout errors; session is cleared locally regardless.
    } finally {
      setSession(null);
      await utils.auth.me.invalidate();
      await utils.profile.me.invalidate();
    }
  }, [utils]);

  const state = useMemo(() => {
    const user: User | null = session?.user ?? null;
    return {
      user,
      session,
      loading,
      isAuthenticated: Boolean(user),
    };
  }, [session, loading]);

  return {
    ...state,
    refresh: () => getSession().then((r) => r.ok && setSession(r.data)),
    logout,
  };
}
