# Empower18 RLS Policy Matrix

This document lists all Row Level Security (RLS) policies defined in the database migrations.

## Migration: 0001_enable_rls.sql

| Table | Policy Name | Command | Using Condition | With Check Condition |
|-------|-------------|---------|-----------------|----------------------|
| profiles | profiles_owner_policy | ALL | auth.uid() = user_id | auth.uid() = user_id |
| student_profiles | student_profiles_owner_policy | ALL | auth.uid() = user_id | auth.uid() = user_id |
| user_roles | user_roles_owner_read_policy | SELECT | auth.uid() = user_id | - |
| saved_opportunities | saved_opportunities_owner_policy | ALL | auth.uid() = user_id | auth.uid() = user_id |
| student_applications | student_applications_owner_policy | ALL | auth.uid() = user_id | auth.uid() = user_id |
| application_events | application_events_owner_read_policy | SELECT | EXISTS(subquery) | - |
| application_tasks | application_tasks_owner_policy | ALL | EXISTS(subquery) | EXISTS(subquery) |
| resumes | resumes_owner_policy | ALL | auth.uid() = user_id | auth.uid() = user_id |
| notifications | notifications_owner_policy | ALL | auth.uid() = user_id | auth.uid() = user_id |
| notification_preferences | notification_preferences_owner_policy | ALL | auth.uid() = user_id | auth.uid() = user_id |
| notification_outbox | notification_outbox_owner_policy | ALL | auth.uid() = user_id | auth.uid() = user_id |
| admin_audit_logs | admin_audit_logs_admin_policy | ALL | EXISTS(user_roles.role='admin') | EXISTS(user_roles.role='admin') |
| opportunities | opportunities_published_read_policy | SELECT | is_published = TRUE | - |
| organisations | organisations_authenticated_read_policy | SELECT | TRUE | - |
| opportunity_organisations | opportunity_organisations_authenticated_read_policy | SELECT | TRUE | - |
| opportunity_sources | opportunity_sources_active_read_policy | SELECT | is_active = TRUE | - |

## Tables WITHOUT RLS

None — all tables have RLS enabled via `enableRLS()` in the Drizzle schema.

## Gaps in RLS Coverage

The following tables have only SELECT policies — no INSERT/UPDATE/DELETE RLS policy:

- `user_roles`: Only SELECT allowed (user can read their own roles only)
- `application_events`: Only SELECT allowed (via application ownership)
- `opportunities`: Only SELECT allowed (published only)
- `organisations`: Only SELECT allowed (all authenticated)
- `opportunity_organisations`: Only SELECT allowed (all authenticated)
- `opportunity_sources`: Only SELECT allowed (active only)

## Testing Requirements

Genuine RLS verification requires:
1. A PostgreSQL database with Supabase Auth extensions (or `auth.uid()` equivalent)
2. Two test users with different `auth.uid()` values
3. An admin user with `user_roles.role = 'admin'`
4. Direct database connections as each user (not through application middleware)

Without Docker/PostgreSQL infrastructure available locally, RLS tests cannot be executed in this environment. Test scripts are provided below and should be run when PostgreSQL is available (e.g., in CI with service containers).
