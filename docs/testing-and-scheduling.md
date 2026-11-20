# Disposable database testing and expiry scheduling

## Local PostgreSQL

Use only the disposable container below; never point `TEST_DATABASE_URL` at the
hosted Supabase project. The CI workflow performs the same bootstrap and
migration steps against its disposable PostgreSQL service.

```powershell
docker compose -f docker-compose.test.yml up -d
$env:TEST_DATABASE_URL = "postgresql://postgres@localhost:5433/postgres"
pnpm test:rls:bootstrap
$env:MIGRATION_DATABASE_URL = $env:TEST_DATABASE_URL
pnpm db:migrate
pnpm test:rls:grant
pnpm test
docker compose -f docker-compose.test.yml down -v
```

The helper scripts only connect to the explicit `TEST_DATABASE_URL`. The RLS
tests roll back their fixture rows after each test; the expiry worker test
removes its isolated fixtures during teardown.

The test bootstrap provides a minimal `auth.uid()` implementation and the
PostgreSQL `anon` and `authenticated` roles expected by the checked-in Supabase
migrations. The tests create fixture rows inside a transaction, switch to the
authenticated role, set the JWT subject claim, assert both allowed and denied
access, then roll the transaction back. This verifies the checked-in PostgreSQL
RLS policies in an isolated database; it is not a full Supabase Auth service
integration test and must never be run against production.

## Opportunity expiry scheduling

`expireDueOpportunities` is idempotent batch processing. It expires a listing
when either its application deadline or explicit listing expiry time has
passed. The external scheduler uses a server-only maintenance endpoint protected
by a 32+ character secret and a configured existing administrator audit actor.

This repository's Vite build writes browser files to `dist/public`, while Vercel
serves only its configured output directory. `vercel.json` therefore sets
`outputDirectory` to `dist/public`; keep it aligned with `build.outDir` in
`vite.config.ts`. The Nitro Vercel build should also include
`.vercel/output/static/index.html` and its hashed assets. Keep Nitro route source
under `routes/api/` because a root-level `api/` directory is reserved by Vercel.
The plugin publishes `/api/maintenance/opportunities/expire` as a Vercel
Function and rewrites frontend page paths to `/index.html` while excluding API,
asset, and file paths. Vercel routes `/api/health`, `/api/platform/config.js`,
and `/api/trpc` through Nitro; the tRPC adapter retains the shared Supabase
bearer-token and role checks. After each routing change, verify `/`, `/login`,
the hashed JavaScript asset referenced by `index.html`, and `/api/health` on the
production domain.
Production must also have `DATABASE_URL` set to the application's Supabase
PostgreSQL session pooler connection string; do not assume a Vercel Postgres
integration URL points to the application's Supabase schema. Vercel serverless
database pools default to one connection unless `DATABASE_POOL_MAX` is explicitly
configured.

Automatic expiry remains disabled until the deployment owner sets the server
variables `OPPORTUNITY_EXPIRY_SECRET` and `OPPORTUNITY_EXPIRY_ACTOR_USER_ID`,
then configures the GitHub repository variable `OPPORTUNITY_EXPIRY_ENABLED=true`,
the HTTPS base URL variable `OPPORTUNITY_EXPIRY_URL`, and the matching
`OPPORTUNITY_EXPIRY_SECRET` GitHub secret. The actor UUID must belong to an
existing admin. Test that the no-credential endpoint returns `401` before
enabling the scheduled workflow. A valid authenticated request processes due
production listings, so do not use it as a harmless connectivity probe. The
secret must not be exposed to browser code or committed.
