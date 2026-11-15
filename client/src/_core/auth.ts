import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

export type { Session, User };

export type AuthError = {
  message: string;
  status?: number;
};

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AuthError };

/**
 * Registration flow.
 *
 * Creates a new user in Supabase Auth. An email verification is sent
 * automatically if email confirmation is enabled in Supabase settings.
 */
export async function signUp(
  email: string,
  password: string,
  options?: { name?: string; redirectTo?: string }
): Promise<AuthResult<{ user: User | null; session: Session | null }>> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      ...(options?.name ? { data: { name: options.name } } : {}),
      ...(options?.redirectTo ? { emailRedirectTo: options.redirectTo } : {}),
    },
  });

  if (error) {
    return { ok: false, error: { message: error.message, status: error.status } };
  }

  return { ok: true, data: { user: data.user, session: data.session } };
}

/**
 * Login flow.
 *
 * Authenticates with email/password. Returns session on success.
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult<{ user: User; session: Session }>> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, error: { message: error.message, status: error.status } };
  }

  if (!data.session || !data.user) {
    return {
      ok: false,
      error: { message: "No session returned from Supabase" },
    };
  }

  return { ok: true, data: { user: data.user, session: data.session } };
}

/**
 * Logout flow.
 *
 * Revokes the refresh token server-side and clears the local session.
 */
export async function signOut(): Promise<AuthResult<null>> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { ok: false, error: { message: error.message, status: error.status } };
  }

  return { ok: true, data: null };
}

/**
 * Password reset request.
 *
 * Sends a password reset email to the user.
 */
export async function resetPassword(
  email: string
): Promise<AuthResult<null>> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    return { ok: false, error: { message: error.message, status: error.status } };
  }

  return { ok: true, data: null };
}

/**
 * Password reset completion.
 *
 * Updates the password after the user has clicked the reset link.
 */
export async function updatePassword(
  newPassword: string
): Promise<AuthResult<null>> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { ok: false, error: { message: error.message, status: error.status } };
  }

  return { ok: true, data: null };
}

/**
 * Email verification.
 *
 * Verifies the OTP token from the email verification link.
 */
export async function verifyEmail(
  tokenHash: string,
  type: "signup" | "email_change" = "signup"
): Promise<AuthResult<null>> {
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return { ok: false, error: { message: error.message, status: error.status } };
  }

  return { ok: true, data: null };
}

/**
 * Session restoration.
 *
 * Returns the current session from localStorage or refreshes if expired.
 */
export async function getSession(): Promise<AuthResult<Session | null>> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { ok: false, error: { message: error.message, status: error.status } };
  }

  return { ok: true, data: data.session };
}

/**
 * Current user.
 *
 * Returns the currently authenticated user or null.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * Session change listener.
 *
 * Subscribes to auth state changes (signin, signout, token refresh, etc.)
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  const { data: subscription } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.subscription.unsubscribe();
}

/**
 * Get the current access token for tRPC requests.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}
