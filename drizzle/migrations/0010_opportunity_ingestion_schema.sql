-- Production opportunity ingestion schema.
-- This migration is intentionally idempotent because the schema may already exist
-- in environments restored from a partially migrated database.
DO $$ BEGIN
  CREATE TYPE public.opportunity_status AS ENUM ('draft','pending_review','published','paused','closed','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.opportunity_type AS ENUM ('apprenticeship','internship','traineeship','part_time','full_time','volunteering','work_experience');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.organisation_type AS ENUM ('employer','training_provider','college','university','charity','government','agency','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.reliability_status AS ENUM ('unknown','healthy','degraded','unhealthy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.source_type AS ENUM ('api','rss','web_scrape','manual','email_parse');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(255) NOT NULL,
  type public.organisation_type, website varchar(512), description text,
  location varchar(255), is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS organisations_name_idx ON public.organisations (name);

CREATE TABLE IF NOT EXISTS public.opportunity_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(255) NOT NULL,
  organisation varchar(255), type public.source_type NOT NULL,
  official_url varchar(512), api_endpoint varchar(512), connector_id varchar(64),
  connector_config jsonb, auth_required boolean NOT NULL DEFAULT false,
  api_key_reference varchar(128), permitted_use text, terms_of_service_url varchar(512),
  retrieval_schedule varchar(64), rate_limit varchar(64),
  last_successful_sync timestamptz, last_failed_sync timestamptz,
  reliability_status public.reliability_status NOT NULL DEFAULT 'unknown',
  source_authority varchar(64), administrator_owner varchar(255),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opportunity_sources_name_idx ON public.opportunity_sources (name);

CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title varchar(255) NOT NULL,
  description text NOT NULL, summary text, type public.opportunity_type NOT NULL,
  category varchar(64), route varchar(64), status public.opportunity_status NOT NULL DEFAULT 'draft',
  location varchar(255), district varchar(64), delivery_method varchar(32),
  is_remote_eligible boolean NOT NULL DEFAULT false, min_age integer, max_age integer,
  education_requirements text, qualification_requirements text,
  required_skills text[] NOT NULL DEFAULT '{}', salary_min numeric(10,2), salary_max numeric(10,2),
  compensation_text text, application_opens_at timestamptz, application_deadline_at timestamptz,
  start_date_at timestamptz, expires_at timestamptz, external_application_url varchar(1024),
  application_instructions text, source_id uuid REFERENCES public.opportunity_sources(id) ON DELETE SET NULL,
  source_record_id varchar(255), canonical_url varchar(1024), verified_by uuid,
  verified_at timestamptz, verification_evidence text, next_review_at timestamptz,
  is_published boolean NOT NULL DEFAULT false, published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opportunities_status_idx ON public.opportunities (status);
CREATE INDEX IF NOT EXISTS opportunities_type_idx ON public.opportunities (type);
CREATE INDEX IF NOT EXISTS opportunities_category_idx ON public.opportunities (category);
CREATE INDEX IF NOT EXISTS opportunities_route_idx ON public.opportunities (route);
CREATE INDEX IF NOT EXISTS opportunities_deadline_idx ON public.opportunities (application_deadline_at);
CREATE INDEX IF NOT EXISTS opportunities_source_id_idx ON public.opportunities (source_id);
CREATE INDEX IF NOT EXISTS opportunities_is_published_idx ON public.opportunities (is_published);
CREATE INDEX IF NOT EXISTS opportunities_expires_at_idx ON public.opportunities (expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS opportunities_canonical_url_unique_idx ON public.opportunities (canonical_url);
CREATE UNIQUE INDEX IF NOT EXISTS opportunities_source_record_unique_idx ON public.opportunities (source_id, source_record_id);

CREATE TABLE IF NOT EXISTS public.opportunity_organisations (
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  role varchar(64) NOT NULL DEFAULT 'provider', created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_organisations_pkey PRIMARY KEY (opportunity_id, organisation_id)
);
CREATE INDEX IF NOT EXISTS opportunity_organisations_opportunity_id_idx ON public.opportunity_organisations (opportunity_id);
CREATE INDEX IF NOT EXISTS opportunity_organisations_organisation_id_idx ON public.opportunity_organisations (organisation_id);
