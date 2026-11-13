# 03 — Target Architecture

**Status:** Proposed (Phase 1 output)  
**Supabase project:** `nasefnbffsdxzjplzfmh`  
**Host:** `db.nasefnbffsdxzjplzfmh.supabase.co`

---

## 1. High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      React 19 + Vite (client)                   │
│  tRPC client ──────────────────────────────────────────────────▶│
└─────────────────────────────────────────────────────────────────┘
                              HTTPS / WSS
┌─────────────────────────────────────────────────────────────────┐
│                    Express + tRPC server                        │
│  • Routers: auth, profile, opportunities, applications,         │
│    resumes, saved, notifications, interview, ucas, admin, …     │
│  • JWT verification (Supabase Auth) per request                 │
│  • Drizzle ORM (pg-core) → PostgreSQL                           │
└─────────────────────────────────────────────────────────────────┘
                              Session Pooler
┌─────────────────────────────────────────────────────────────────┐
│                 Supabase PostgreSQL (pgvector, RLS)             │
│  • auth.users (Supabase Auth)                                   │
│  • profiles, student_profiles, opportunities,                   │
│    applications, resumes, notifications, …                      │
│  • RLS policies enforced per authenticated user                 │
└─────────────────────────────────────────────────────────────────┘
                              Signed URLs
┌─────────────────────────────────────────────────────────────────┐
│                  Supabase Storage (private buckets)             │
│  • student-cvs, application-documents, interview-recordings     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Connection strategy

| Environment | Connection URL | Pooler mode | Prepared statements |
|---|---|---|---|
| Local development | `DATABASE_URL` (session pooler) | Session | Enabled |
| Automated tests | `DATABASE_URL` (test DB or transaction pooler) | Transaction | Disabled |
| Production Express runtime | `DATABASE_URL` (session pooler) | Session | Enabled |
| Migrations | `MIGRATION_DATABASE_URL` (direct, port 5432) | Direct | Enabled |
| Scheduled jobs/workers | `DATABASE_URL` (session pooler) | Session | Enabled |

- `DATABASE_URL` ≠ `MIGRATION_DATABASE_URL` — kept separate
- Transaction pooler used only where short-lived connections are needed (tests, serverless); Drizzle configured without prepared statements in that mode
- Connection limits, timeouts, and idle settings tuned per environment

---

## 3. Authentication

- **Supabase Auth** as the single identity system (ADR-002)
- Email/password + supported OAuth providers
- Express verifies the Supabase JWT (`getClaims`/`getUser`) on every protected tRPC request
- `auth.users.id` (UUID) is the identity reference; `profiles.user_id` references it
- Legacy Manus `openId` preserved as a mapping column during transition

---

## 4. Authorisation model

Roles (server-determined, never trusted from client):
- `student` — owns own profile, CV, applications, saved items, documents
- `content_reviewer` — can review/verify opportunities
- `admin` — full opportunity + user management + audit logs
- `super_admin` — system configuration, role management

Deny-by-default. Every user-owned procedure checks ownership; every admin procedure checks role.

---

## 5. Database schema (core entities)

- `profiles` — public profile display name, timezone, preferences
- `student_profiles` — age band, district, interests, routes, goals (minimal PII)
- `organisations` — employers, universities, colleges, charities, etc.
- `opportunities` — canonical opportunity records with source, verification status, eligibility
- `opportunity_organisations` — many-to-many link
- `saved_opportunities` — user × opportunity, unique pair
- `student_applications` — application records with stage history
- `application_events` — stage change audit trail
- `application_tasks` — tasks/deadlines per application
- `resumes` / `resume_versions` / `resume_sections` — structured CV data
- `notifications` / `notification_preferences` / `notification_outbox` — notification system
- `user_roles` / `admin_audit_logs` — RBAC + audit
- `knowledge_sources` / `knowledge_documents` / `knowledge_chunks` — RAG (Phase 9)
- `application_assistant_sessions` / `application_drafts` — AI assistant (Phase 7)
- `interview_sessions` / `interview_questions` / `interview_answers` — interview practice (Phase 7)
- `ucas_profiles` / `ucas_statement_drafts` — UCAS assistant (Phase 7)

---

## 6. Storage

- Private Supabase Storage buckets: `student-cvs`, `application-documents`, `interview-recordings`, `private-exports`
- No public buckets for student documents
- Short-lived signed URLs for downloads
- Ownership enforced server-side

---

## 7. AI architecture

- Provider abstraction layer (OpenAI-compatible interface)
- Structured output with Zod validation
- Per-user rate limits, token budgets, cost monitoring
- Deterministic eligibility engine (SQL rules), never LLM for hard eligibility
- RAG via PostgreSQL `pgvector` (Phase 9, if justified)

---

## 8. Notifications

- In-app notifications persisted in `notifications` table
- Outbox pattern via `notification_outbox`
- Supabase Queues/Cron evaluated first; Node worker fallback
- Resend for transactional email
- User preferences respected; `Europe/London` default timezone

---

## 9. What is NOT in scope for MVP

- Voice interview practice (text-first only)
- SMS notifications
- External vector database (pgvector in Postgres only if needed)
- Novu or other external notification platform
- Direct scraping of third-party sites without authorisation
- Automatic application submission (prohibited)
