# ADR-001 — Database Platform: Supabase PostgreSQL

**Status:** Proposed  
**Date:** 2026-11-13  
**Deciders:** Principal Backend Engineering

## Context

Empower18 currently uses MySQL via `drizzle-orm/mysql-core` and `mysql2`. The database has a single `users` table. The project has a Supabase project provisioned (`nasefnbffsdxzjplzfmh`) offering PostgreSQL, Auth, Storage, Realtime, pgvector, Queues, and Cron.

## Options considered

| Option | Security | Complexity | Cost | Performance | Maintainability | DX | Lock-in | Migration risk |
|---|---|---|---|---|---|---|---|---|
| Supabase PostgreSQL | High (RLS, Auth integration) | Medium | Low (free tier) | Good | High | High | Medium | Medium (MySQL→PG) |
| Hosted PostgreSQL (RDS/Neon/etc.) | High | Medium | Medium | Good | High | High | Medium | Medium |
| Retain managed MySQL | Medium | Low | Low | Good | Medium | High | Medium | None (status quo) |

## Decision

Use **Supabase PostgreSQL** as the application database.

## Rationale

1. **Auth alignment:** Supabase Auth JWTs integrate directly with PostgreSQL RLS, enabling row-level security tied to `auth.uid()`.
2. **Single platform:** Storage, Auth, pgvector, Queues, and Cron are available in one project, avoiding multiple infrastructure vendors.
3. **Cost-conscious:** Supabase free tier is sufficient for MVP; no additional infrastructure required.
4. **Drizzle support:** Drizzle's `pg-core` is mature and well-documented for PostgreSQL.
5. **Future RAG path:** pgvector is available as a PostgreSQL extension if semantic search is later justified.

## Trade-offs

- MySQL → PostgreSQL migration requires schema conversion (`mysql-core` → `pg-core`, `int` auto-inc → `uuid`/`serial`, `enum` → PostgreSQL enum/check constraints, `onDuplicateKeyUpdate` → `onConflict`).
- Existing Manus OAuth `openId` identifiers must be mapped to `auth.users.id`.
- Some Supabase vendor lock-in, but data remains in standard PostgreSQL and is exportable.

## Consequences

- `drizzle.config.ts` dialect changes from `mysql` to `pg`.
- Schema rewritten in `pg-core` with UUID primary keys where appropriate.
- Explicit migration files generated with `drizzle-kit generate` (no `drizzle-kit push` in production).
- `DATABASE_URL` and `MIGRATION_DATABASE_URL` separated.

## Open questions

- Confirmed pooler hostnames from Supabase Dashboard (session vs transaction) — to be obtained during Phase 2.
