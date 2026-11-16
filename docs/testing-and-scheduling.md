# Disposable database testing and expiry scheduling

## Local PostgreSQL

Use only the disposable container below; never point `TEST_DATABASE_URL` at the
hosted Supabase project.

```powershell
docker compose -f docker-compose.test.yml up -d
$env:TEST_DATABASE_URL = "postgresql://postgres@localhost:5433/postgres"
pnpm test
docker compose -f docker-compose.test.yml down -v
```

The test harness creates and destroys databases named `empower18_qa_*`. It
never falls back to `DATABASE_URL`.

The standard PostgreSQL container is useful for migration and ordinary database
constraint testing. It is **not** proof of Supabase RLS behaviour: the current
migrations depend on Supabase's `auth.uid()` context and real authenticated
claims. Genuine RLS verification therefore requires a local Supabase stack or
an equivalent controlled environment that supplies those claims.

## Opportunity expiry scheduling

`expireDueOpportunities` is idempotent batch processing invoked through an
admin-protected tRPC procedure. No hosting or scheduler configuration is
present in this repository, so no production schedule is configured here.

Before enabling automatic expiry, the deployment owner must select the scheduler
supported by the actual hosting platform and configure a secure invocation path.
The scheduled invoker must authenticate as an authorised administrator (or use a
separate, server-only maintenance identity), record failures, and avoid exposing
a public maintenance endpoint.
