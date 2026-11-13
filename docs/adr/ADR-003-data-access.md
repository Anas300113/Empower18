# ADR-003 — Data Access: Express + tRPC + Drizzle (direct PostgreSQL)

**Status:** Proposed  
**Date:** 2026-11-13  
**Deciders:** Principal Backend Engineering

## Context

Empower18 uses Express + tRPC + Drizzle with MySQL. The backend is a long-running Node process, not serverless. Supabase offers both direct PostgreSQL access and a Data API (HTTP/REST).

## Options considered

| Option | Security | Complexity | Cost | Performance | DX | Lock-in | Suitability |
|---|---|---|---|---|---|---|---|
| Express + tRPC + Drizzle (direct PG) | High (app-layer auth) | Low (existing stack) | Low | Good | High | Low | Excellent |
| Supabase Data API | Medium | Low | Low | Fair | Medium | High | Poor (no complex transactions/RLS control) |
| Hybrid (Data API + direct) | Medium | High | Low | Fair | Medium | High | Poor |

## Decision

Retain **Express + tRPC + Drizzle** with direct PostgreSQL connections.

## Rationale

1. **Existing stack:** Team familiarity, no rewrite of the API layer.
2. **Application-layer authorisation:** Complex ownership and role checks are easier in TypeScript than via HTTP API filters.
3. **Transactions:** Multi-table operations (e.g., application + events + tasks) need ACID transactions, which direct Drizzle supports cleanly.
4. **No SSR framework:** The frontend is Vite + React SPA; Next.js-specific Data API patterns are not applicable.
5. **Connection:** A persistent Express server can use the Supabase session pooler efficiently.

## Trade-offs

- Application layer must enforce ownership/RLS-equivalent checks (the `postgres` owner connection bypasses RLS by default).
- Direct connection requires managing pool size and timeouts.

## Consequences

- `DATABASE_URL` (session pooler) for runtime; `MIGRATION_DATABASE_URL` (direct) for migrations.
- A least-privilege database role is evaluated for runtime; RLS policies defined for user-owned tables.
- Secret/service-role key used only server-side for admin operations that legitimately bypass RLS.
