# ADR-002 — Authentication: Supabase Auth (single identity)

**Status:** Proposed  
**Date:** 2026-11-13  
**Deciders:** Principal Backend Engineering

## Context

Empower18 currently uses a custom Manus OAuth flow with a separate `users` table in MySQL. Identity is decoupled from the database, making RLS integration awkward. The platform lacks registration, password reset, email verification, and account deletion.

## Options considered

| Option | Security | Complexity | Cost | RLS integration | Feature coverage | Migration effort | Lock-in |
|---|---|---|---|---|---|---|---|
| A. Retain Manus OAuth | Medium | Low | Low | Weak | No registration/reset/verify/delete | None | High (Manus-specific) |
| B. Supabase Auth | High | Medium | Low (free tier) | Strong | All flows built-in | Medium (map openId → auth.users.id) | Medium |
| C. Hybrid (external IdP + Supabase DB) | Medium | High | Low | Complex | Partial | High | High |

## Decision

Adopt **Supabase Auth** as the single identity system. Replace Manus OAuth.

## Rationale

1. **Single identity:** One user store (`auth.users`) for both application logic and RLS.
2. **Complete flows:** Registration, login, logout, email verification, password reset, session refresh, account deletion are built-in.
3. **RLS alignment:** JWTs carry `sub` (= `auth.users.id`) which can be used in `auth.uid()` RLS policies.
4. **Storage integration:** Supabase Storage respects Auth JWTs for signed URL generation.
5. **OAuth providers:** Google, Apple, Microsoft, etc. can be enabled via Supabase without custom code.

## Trade-offs

- Existing Manus `users.openId` must be mapped to `auth.users.id` via a migration/identity mapping.
- OAuth routes (`/api/oauth/callback`, `sdk.ts` OAuth logic) are removed/replaced.
- User records created under Manus must be migrated or re-invited.

## Consequences

- Remove `/api/oauth/callback` and Manus OAuth SDK methods; replace with Supabase Auth client calls.
- `sdk.authenticateRequest` replaced by Supabase JWT verification (`getClaims`/`getUser`) on each protected tRPC request.
- `users` table replaced by `profiles` referencing `auth.users.id`.
- `role` moved from application data to a server-controlled `user_roles` table.
- Frontend uses `@supabase/supabase-js` (browser) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` only.
- Backend uses service-role key only in trusted environment (never exposed to browser).

## Open questions

- Whether existing Manus users need to be migrated or re-registered (depends on whether production data exists in the MySQL `users` table — to be confirmed).
