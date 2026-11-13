# 00 — Current State Audit

**Repository:** https://github.com/Anas300113/Empower18  
**Branch:** `main` (clean, up to date with `origin/main`)  
**Commit:** `f3357c5ccb6e0c3e810486395e1b2f3267d6d154`  
**Audited:** 2026-11-13  
**Auditor:** Principal Backend Engineering (Cline)

---

## 1. Summary

Empower18 is a React 19 / Express / tRPC / Drizzle starter adapted from the Manus `web-db-user` template. The frontend is a complete clickable shell with clearly-labelled sample data, but **all student-facing feature data is static** (`client/src/data.ts`) or local React state. The backend registers only two tRPC routers (`system` health and `auth` me/logout). There is **no backend feature logic** for opportunities, applications, CVs, saved items, notifications, or admin review.

The database is **MySQL** with a single `users` table backing a custom Manus OAuth flow. Migrating to Supabase PostgreSQL is required.

---

## 2. Verified tech stack

| Layer | Technology | Version / source |
|---|---|---|
| Frontend | React 19, Vite 7, TypeScript 5.9, Tailwind 4, Radix UI, Lucide, wouter | `package.json` |
| API | tRPC 11, `@trpc/react-query`, TanStack Query | `package.json` |
| Backend | Express 4 | `package.json` |
| ORM | Drizzle ORM 0.45, `drizzle-orm/mysql-core` | `package.json`, `drizzle.config.ts` (dialect: `mysql`) |
| Database | MySQL | `server/db.ts` (`drizzle-orm/mysql2`) |
| Auth | Manus OAuth (custom), `jose` 6.1.0 (JWT) | `server/_core/sdk.ts`, `server/_core/oauth.ts` |
| Storage | Forge/Manus presigned S3 (`server/storage.ts`) | unwired in routers |
| AI helpers | `llm.ts`, `imageGeneration.ts`, `voiceTranscription.ts` | present, **not registered** in `routers.ts` |
| Tests | Vitest 2 (`server/**/*.test.ts`) | 2 test files only |
| Package manager | pnpm 10.18.0 workspace | `packageManager` |

`node_modules` is **not installed** (could not run build/typecheck/tests during this audit). `.env` and `.env.example` are both **missing**.


---

## 3. Database (verified)

`drizzle/schema.ts` — one table only, MySQL dialect:

```sql
CREATE TABLE IF NOT EXISTS `users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320),
  `loginMethod` varchar(64),
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY(`id`),
  UNIQUE(`openId`)
);
```

- Migration: `drizzle/0000_initial_users.sql` (MySQL DDL)

---

## 4. Authentication (verified)

**Manus OAuth flow:**
1. Client calls `startLogin()` → navigates to Manus OAuth portal with `appId`, `redirectUri`, `state` (nonce + redirect URI)
2. `__Host-oauth_state` nonce cookie set (SameSite=None, Secure, 10 min TTL)
3. Callback `/api/oauth/callback` exchanges `code` + `state` for Manus access token, fetches `userInfo` (openId, name, email, platform)
4. `db.upsertUser` creates/updates `users` row
5. `sdk.signSession` mints a `jose` JWT session cookie `webdev_app_session` (httpOnly, secure, sameSite=none, 1 year)
6. `sdk.authenticateRequest` verifies JWT on each tRPC request via `jwtVerify`, binds to `MANUS_PROJECT_ID`, auto-syncs user

**tRPC procedures:**
- `publicProcedure` — no auth
- `protectedProcedure` — requires `ctx.user`
- `adminProcedure` — requires `ctx.user.role === 'admin'`

**Gaps:**
- No registration, no password reset, no email verification, no account deletion
- No supported OAuth providers (Google/Apple/Microsoft) beyond Manus
- Role is application data in `users.role`; admin escalation via `ENV.ownerOpenId` (fragile)
- Identity is decoupled from Supabase; RLS/JWT-based Supabase authorisation is awkward

- `drizzle/migrations/` is empty (`.gitkeep`)
- `drizzle/meta/0000_snapshot.json` and `_journal.json` exist
- `relations.ts` is empty
- No `opportunities`, `applications`, `saved_opportunities`, `resumes`, `notifications`, or any feature tables exist

---

## 5. Feature state — real vs prototype

| Area | Frontend | Backend API | Database | Persists? | Notes |
|---|---|---|---|---|---|
| Login/logout | Yes | Yes (Manus) | Yes (`users`) | Partial | Cookie session only |
| Registration | No | No | No | No | Missing entirely |
| Password reset | No | No | No | No | Missing |
| Onboarding | Yes (local state) | No | No | No | Not saved |
| Profile/settings | Yes (static values) | No | No | No | Hard-coded "Alex" |
| Opportunities | Yes (static `data.ts`) | No | No | No | Sample data, labelled prototype |
| Saved opportunities | No | No | No | No | Missing |
| Application tracker | Yes (static) | No | No | No | Static in `data.ts` |
| CV builder | Yes (shell) | No | No | No | No structured schema |
| AI assistant | Yes (shell) | No | No | No | Helpers present, unwired |
| Interview practice | Yes (shell) | No | No | No | Missing |
| UCAS assistant | Yes (shell) | No | No | No | Missing |
| Notifications | Yes (static) | No | No | No | Static in `data.ts` |
| Admin | Yes (static sample) | Partially (`adminProcedure`, `notifyOwner`) | Yes (role column) | Partial | No review queue, no audit log |
| File uploads | No | Partially (`storage.ts`) | No | No | Unwired in routers |


---

## 6. Existing tests (verified)

- `server/auth.logout.test.ts` — verifies `auth.logout` clears `webdev_app_session` cookie with correct options
- `server/platform.test.ts` — verifies public config does not leak secrets, cookie options, session signing/verification binding to project ID

**No tests exist for:** authorisation, ownership/isolation, opportunity logic, application logic, CV logic, notification logic, cross-user access, or RLS.

---

## 7. Environment & configuration

| Item | Status |
|---|---|
| `.env` | Missing |
| `.env.example` | Missing |
| `DATABASE_URL` | Referenced in `drizzle.config.ts` and `server/db.ts` but not configured |
| Supabase variables | None present (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, etc. absent) |
| AI variables | `MANUS_FORGE_API_URL`/`MANUS_FORGE_API_KEY` used via `ENV.forgeApiUrl`/`forgeApiKey` |
| No secrets exposed in repo | Confirmed (`.env` gitignored, no `.env` present) |

---

## 8. CI/CD & deployment

- `pnpm dev` — `NODE_ENV=development tsx watch server/_core/index.ts` (port 3000)
- `pnpm build` — `vite build && esbuild server/_core/index.ts ... --outdir=dist`
- `pnpm start` — `NODE_ENV=production node dist/index.js`
- `pnpm check` — `tsc --noEmit`
- `pnpm test` — `vitest run`
- `pnpm db:push` — `drizzle-kit generate && drizzle-kit migrate`
- `pnpm db:migrate` — `drizzle-kit migrate`
- No CI configuration file found (no `.github/workflows`, no `docker-compose.yml`)
- Dockerfile present (368 bytes) but not verified

---

## 9. Security observations

- Session cookie: httpOnly, secure, sameSite=none — appropriate for cross-site Preview
- OAuth state nonce: `__Host-` prefix, CSRF guard on callback — good practice
- `publicPlatformScript` explicitly serialises only named public values; secrets excluded — good
- **No server-side authorisation on feature routes** (none exist yet)
- **No RLS** (MySQL, no Supabase)
- **No input validation beyond basic zod in `systemRouter`**
- Storage proxy `/manus-storage/*` redirects to Forge signed URLs — no ownership enforcement visible
- AI helpers use `ENV.forgeApiKey` (server-side) — keys not exposed to browser

---

## 10. Data migration considerations

- Existing `users` table uses MySQL `int` auto-increment PK + `openId` (Manus identifier)
- Supabase Auth uses UUID `auth.users.id` as identity reference
- Migration strategy: preserve `openId` as a legacy identifier column; map `users.id` → `auth.users.id` via a mapping/identity table
- No evidence of production user data; must be confirmed before any migration (no destructive operations)

---

## 11. Conclusion

The repository is a **frontend prototype with a minimal auth foundation**. To become a production-capable platform it requires:

1. Database migration MySQL → Supabase PostgreSQL (Drizzle `pg-core`)
2. Authentication migration Manus OAuth → Supabase Auth (single identity)
3. Complete feature backend implementation (opportunities, applications, CV, saved, notifications, admin)
4. Authorisation layer (RBAC, ownership checks, RLS strategy)
5. Comprehensive test suite including mandatory cross-user isolation tests

See `01-feature-to-backend-map.md` and `02-existing-risks-and-gaps.md` for details.

