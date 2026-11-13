# 02 — Existing Risks and Gaps

**Severity:** Critical = blocks MVP / security / data safety; High = required before public launch; Medium = design now, implement later.

| ID | Risk / gap | Severity | Evidence | Recommended mitigation |
|---|---|---|---|---|
| R-001 | Identity decoupled from database (Manus OAuth vs MySQL `users`) | Critical | `server/_core/sdk.ts`, `drizzle/schema.ts` | Adopt Supabase Auth as single identity; map legacy `openId` |
| R-002 | Role is application data, not server-controlled authorisation | Critical | `users.role` enum, `ENV.ownerOpenId` escalation | RBAC table `user_roles`; server-side role checks on every admin procedure |
| R-003 | No registration / password reset / email verification / account deletion | Critical | `routers.ts` has only `me`/`logout` | Supabase Auth provides all flows natively |
| R-004 | No backend feature logic; all student data is static/local state | Critical | `client/src/data.ts`, no feature routers | Implement feature routers + PostgreSQL schema |
| R-005 | No cross-user isolation test (mandatory acceptance criterion) | Critical | Only 2 vitest files, neither tests isolation | Add tests: student A cannot access student B's profile/CV/saved/applications |
| R-006 | MySQL → PostgreSQL migration required for Supabase | High | `drizzle.config.ts` dialect `mysql`, `mysql2` driver | Convert schema to `pg-core`, generate explicit migration files, test on disposable DB |
| R-007 | No `.env` / `.env.example`; no production configuration surface | High | `Test-Path` both missing | Create `.env.example` with all required variables (no real secrets) |
| R-008 | `node_modules` not installed; build/typecheck/tests cannot run | High | `Test-Path node_modules` = False | Install dependencies (Act mode), run `pnpm check`, `pnpm test`, `pnpm build` |
| R-009 | No remote Supabase connectivity verified | High | Supabase project `nasefnbffsdxzjplzfmh` documented but untested | Verify direct + pooler connections from this environment |
| R-010 | No CI/CD configuration | Medium | No `.github/workflows`, no `docker-compose.yml` | Add GitHub Actions for check/test/build on PR |
| R-011 | No RLS / row-level security | Medium | MySQL has no RLS concept | Define RLS policy strategy for Supabase; enforce ownership in application layer |
| R-012 | No input validation on feature routes (none exist) | Medium | `systemRouter` only validates `health` | Zod input schemas on every tRPC procedure |
| R-013 | Storage ownership not enforced | Medium | `storage.ts` / `storageProxy.ts` no ownership checks | Supabase Storage private buckets + RLS-equivalent ownership checks |
| R-014 | AI helpers present but unwired; no cost/quota controls | Medium | `llm.ts`, `imageGeneration.ts` exist, not in routers | Provider abstraction, per-user rate limits, token budgets, structured output validation |
| R-015 | No audit log for admin actions | Medium | No `admin_audit_logs` table | Add `admin_audit_logs`; write on every admin mutation |
| R-016 | Onboarding age bands too broad (`18+` undifferentiated) | Medium | `Onboarding.tsx` options: `14–15`, `16–17`, `18+`, `Prefer not to say` | Explicit age bands aligned to 16–20 core audience; eligibility logic |
| R-017 | No backup / recovery plan documented | Medium | No ops docs | Define Supabase backup strategy, point-in-time recovery, rollback procedure |
| R-018 | No sensitive-data redaction in logs | Medium | `console.log`/`console.error` used widely | Structured logging; never log passwords, tokens, PII, or document contents |
| R-019 | No rate limiting on tRPC procedures | Medium | No rate-limit middleware | Per-user/IP rate limits, especially AI and auth endpoints |
| R-020 | No migration rollback / recovery procedure documented | Medium | `drizzle-kit migrate` only applies forward | Document down-migrations and point-in-time restore |
