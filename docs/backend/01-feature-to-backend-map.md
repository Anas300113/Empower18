# 01 — Feature-to-Backend Map

**Source of truth:** current repository HEAD (`main`, commit `f3357c5`)  
**Evidence basis:** static inspection of `client/src/data.ts`, `client/src/pages/Platform.tsx`, `server/routers.ts`, `server/db.ts`, `drizzle/schema.ts`, `server/_core/*`

Legend:
- `✓` = implemented and verified
- `~` = partial / shell only
- `✗` = not implemented

| Feature | Frontend exists? | API exists? | Database exists? | Persistence works? | Status | Remaining work |
|---|---|---|---|---|---|---|
| Student registration | ✗ | ✗ | ✗ | ✗ | ✗ | Supabase Auth registration, email verification |
| Student login | ✓ | ✓ | ✓ | ~ | ~ | Manus OAuth works; replace with Supabase Auth |
| Student logout | ✓ | ✓ | ✗ | ✓ | ✓ | Cookie clear; keep on migration |
| Password reset | ✗ | ✗ | ✗ | ✗ | ✗ | Supabase Auth reset flow |
| Email verification | ✗ | ✗ | ✗ | ✗ | ✗ | Supabase Auth confirm email |
| Account deletion | ✗ | ✗ | ✗ | ✗ | ✗ | Supabase Auth delete + related data cleanup |
| Onboarding | ✓ (local state) | ✗ | ✗ | ✗ | ✗ | Persist onboarding responses to `student_profiles` |
| User profile | ✓ (static "Alex") | ✗ | ✗ | ✗ | ✗ | `profiles` + `student_profiles` tables, ownership |
| Settings / privacy | ✓ (UI only) | ✗ | ✗ | ✗ | ✗ | Preference tables, APIs |
| Opportunities list | ✓ (static `data.ts`) | ✗ | ✗ | ✗ | ✗ | `opportunities`, `organisations` tables + ingestion |
| Opportunity detail | ✓ (UI only) | ✗ | ✗ | ✗ | ✗ | API to fetch canonical record by ID |
| Opportunity search/filter | ✓ (UI only) | ✗ | ✗ | ✗ | ✗ | PostgreSQL FTS + relational filters |
| Save/unsave opportunity | ✗ | ✗ | ✗ | ✗ | ✗ | `saved_opportunities` table + API |
| Application tracker | ✓ (static `data.ts`) | ✗ | ✗ | ✗ | ✗ | `student_applications`, `application_events` |
| Application stage history | ✗ | ✗ | ✗ | ✗ | ✗ | `application_events` audit trail |
| Application tasks/deadlines | ✗ | ✗ | ✗ | ✗ | ✗ | `application_tasks` table |
| CV builder | ✓ (shell) | ✗ | ✗ | ✗ | ✗ | `resumes`, `resume_versions`, `resume_sections` |
| CV preview | ✓ (UI only) | ✗ | ✗ | ✗ | ✗ | Render from structured data |
| PDF export | ✗ | ✗ | ✗ | ✗ | ✗ | `@react-pdf/renderer` server-side |
| Multiple CV versions | ✗ | ✗ | ✗ | ✗ | ✗ | `resume_versions` |
| AI application assistant | ✓ (shell) | ✗ | ✗ | ✗ | ✗ | Provider abstraction, structured output, quotas |
| Interview practice | ✓ (shell) | ✗ | ✗ | ✗ | ✗ | `interview_sessions`, questions, feedback, rubric |
| UCAS assistant | ✓ (shell) | ✗ | ✗ | ✗ | ✗ | `ucas_statement_drafts`, char counts, entry-year |
| Notifications (in-app) | ✓ (static) | ✗ | ✗ | ✗ | ✗ | `notifications` table, outbox, preferences |
| Email notifications | ✗ | ✗ | ✗ | ✗ | ✗ | Resend integration, `notification_outbox` |
| Admin opportunity review | ✓ (static sample) | ~ (`adminProcedure`) | ~ (role col) | ~ | ~ | Review queue, verification lifecycle, audit log |
| Admin user management | ✗ | ✗ | ~ | ✗ | ✗ | `user_roles`, server-side role checks |
| File uploads (CV/docs) | ✗ | ~ (`storage.ts`) | ✗ | ✗ | ✗ | Supabase Storage, signed URLs, ownership |
| RAG knowledge base | ✗ | ✗ | ✗ | ✗ | ✗ | `knowledge_*` tables, ingestion, pgvector (eval) |
| Analytics / impact | ✗ (placeholders) | ✗ | ✗ | ✗ | ✗ | `platform_events`, `impact_measurements` |
| Health check | ✓ (`system.health`) | ✓ | ✗ | ✗ | ~ | Add DB + Auth dependency checks |

**Key finding:** 22 of 29 features have no backend API and no database backing. The frontend is a shell; `client/src/data.ts` is the sole data source for opportunities, applications, careers, notifications, and support items.
