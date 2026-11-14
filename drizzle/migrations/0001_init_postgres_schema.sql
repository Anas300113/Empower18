-- Migration: 0001_init_postgres_schema
-- Description: Initial PostgreSQL schema for Empower18
-- Dialect: postgresql (pg-core)
--
-- This migration creates the foundational tables:
--   - users (legacy, kept during Manus OAuth -> Supabase Auth transition)
--   - user_roles (server-controlled RBAC)
--   - profiles (core user profile)
--   - student_profiles (onboarding data)
--   - organisations + opportunity_organisations
--   - opportunity_sources (source registry)
--   - opportunities (canonical opportunity records)
--   - saved_opportunities
--   - student_applications + application_events + application_tasks
--   - resumes
--   - notifications + notification_preferences + notification_outbox
--   - admin_audit_logs
--
-- IMPORTANT — Supabase identity:
--   All user-facing tables reference auth.users(id), the Supabase-managed
--   identity table. We do NOT create a duplicate identity table. auth.users
--   is owned by Supabase Auth and is never created, altered, or queried by
--   this migration.
--
-- IMPORTANT — RLS:
--   Row-level security is enabled on application tables. RLS does NOT protect
--   queries made through a privileged connection (e.g. SUPABASE_SECRET_KEY /
--   service_role) that bypasses RLS. Server-side code must enforce its own
--   authorization in addition to RLS.
--
-- Review before applying. Do not run destructive operations on production.
-- Test on an empty disposable Supabase project first.

-- Enable UUID generation (pgcrypto; gen_random_uuid() is native on PG 13+ / Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'employer', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE opportunity_type AS ENUM (
    'apprenticeship', 'internship', 'traineeship', 'part_time',
    'full_time', 'volunteering', 'work_experience'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE opportunity_status AS ENUM (
    'draft', 'pending_review', 'published', 'paused', 'closed', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE application_stage AS ENUM (
    'interested', 'started', 'submitted', 'under_review',
    'interview', 'offer', 'rejected', 'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'application_update', 'deadline_reminder', 'new_opportunity', 'message', 'system'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE outbox_status AS ENUM (
    'pending', 'processing', 'sent', 'failed', 'dead_letter'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE source_type AS ENUM (
    'api', 'rss', 'web_scrape', 'manual', 'email_parse'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE reliability_status AS ENUM (
    'unknown', 'healthy', 'degraded', 'unhealthy'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE organisation_type AS ENUM (
    'employer', 'training_provider', 'college', 'university',
    'charity', 'government', 'agency', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Legacy users table (Manus OAuth -> Supabase Auth transition)
-- Retained ONLY during the authentication migration window.
-- id stays an auto-increment integer so the existing Manus auth flow continues
-- to work. Do NOT add new features against this table.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  open_id VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  login_method VARCHAR(64),
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_signed_in TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_open_id_idx ON users(open_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Organisations
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type organisation_type,
  website VARCHAR(512),
  description TEXT,
  location VARCHAR(255),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS organisations_name_idx ON organisations(name);

-- ─────────────────────────────────────────────────────────────────────────────
-- Opportunity sources (registry)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS opportunity_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  organisation VARCHAR(255),

-- ─────────────────────────────────────────────────────────────────────────────
-- Opportunities (canonical opportunity records)
-- Created BEFORE opportunity_organisations so the FK reference resolves.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  summary TEXT,
  type opportunity_type NOT NULL,
  status opportunity_status NOT NULL DEFAULT 'draft',
  location VARCHAR(255),
  district VARCHAR(64),
  delivery_method VARCHAR(32),
  is_remote_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  min_age INTEGER,
  max_age INTEGER,
  education_requirements TEXT,
  qualification_requirements TEXT,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  salary_min NUMERIC(10, 2),
  salary_max NUMERIC(10, 2),
  compensation_text TEXT,
  application_opens_at TIMESTAMPTZ,
  application_deadline_at TIMESTAMPTZ,
  start_date_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  external_application_url VARCHAR(1024),
  application_instructions TEXT,
  source_id UUID REFERENCES opportunity_sources(id) ON DELETE SET NULL,
  source_record_id VARCHAR(255),
  canonical_url VARCHAR(1024),
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  verification_evidence TEXT,
  next_review_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS opportunities_status_idx ON opportunities(status);
CREATE INDEX IF NOT EXISTS opportunities_type_idx ON opportunities(type);
CREATE INDEX IF NOT EXISTS opportunities_deadline_idx ON opportunities(application_deadline_at);
CREATE INDEX IF NOT EXISTS opportunities_source_id_idx ON opportunities(source_id);
CREATE INDEX IF NOT EXISTS opportunities_is_published_idx ON opportunities(is_published);
CREATE INDEX IF NOT EXISTS opportunities_expires_at_idx ON opportunities(expires_at);
CREATE INDEX IF NOT EXISTS opportunities_full_text_idx
  ON opportunities USING GIN (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Opportunity organisations (many-to-many) — created AFTER opportunities
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS opportunity_organisations (
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles (core user profile, 1:1 with auth.users)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(120),
  timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/London',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Student profiles (onboarding data, progressive collection)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  age_band VARCHAR(16),
  district VARCHAR(64),
  education_level VARCHAR(64),
  interests TEXT[] NOT NULL DEFAULT '{}',
  routes_of_interest TEXT[] NOT NULL DEFAULT '{}',
  goals TEXT,
  accessibility_needs TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_user_id_idx ON student_profiles(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- User roles (server-controlled RBAC, never trusted from client)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'student',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_idx ON user_roles(user_id, role);

-- ─────────────────────────────────────────────────────────────────────────────
-- Saved opportunities
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT

-- ─────────────────────────────────────────────────────────────────────────────
-- Student applications + events + tasks
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  stage application_stage NOT NULL DEFAULT 'interested',
  is_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS student_applications_user_id_idx ON student_applications(user_id);
CREATE INDEX IF NOT EXISTS student_applications_opportunity_id_idx ON student_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS student_applications_stage_idx ON student_applications(stage);

CREATE TABLE IF NOT EXISTS application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES student_applications(id) ON DELETE CASCADE,
  stage application_stage NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS application_events_application_id_idx ON application_events(application_id);

CREATE TABLE IF NOT EXISTS application_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES student_applications(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS application_tasks_application_id_idx ON application_tasks(application_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Resumes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  storage_path VARCHAR(512) NOT NULL,
  content_type VARCHAR(128),
  file_size_bytes INTEGER,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Notifications + preferences + outbox
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  link_url VARCHAR(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  deadline_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  new_opportunities BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_user_id_idx ON notification_preferences(user_id);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  link_url VARCHAR(1024),
  status outbox_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  provider_message_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS notification_outbox_status_idx ON notification_outbox(status);
CREATE INDEX IF NOT EXISTS notification_outbox_next_attempt_idx ON notification_outbox(next_attempt_at);
CREATE INDEX IF NOT EXISTS notification_outbox_user_id_idx ON notification_outbox(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin audit log
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(128) NOT NULL,

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-update updated_at trigger function
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER organisations_set_updated_at BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER opportunity_sources_set_updated_at BEFORE UPDATE ON opportunity_sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER opportunities_set_updated_at BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER student_profiles_set_updated_at BEFORE UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER student_applications_set_updated_at BEFORE UPDATE ON student_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER application_tasks_set_updated_at BEFORE UPDATE ON application_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER resumes_set_updated_at BEFORE UPDATE ON resumes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER notifications_set_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER notification_preferences_set_updated_at BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
--
-- WARNING: RLS does NOT protect queries made through a privileged connection
-- (SUPABASE_SECRET_KEY / service_role) that bypasses RLS. Server-side code
-- must enforce its own authorization in addition to RLS.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read their own profile data.
CREATE POLICY profiles_read_own ON profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY profiles_manage_own ON profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY student_profiles_read_own ON student_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY student_profiles_manage_own ON student_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_roles_read_own ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY saved_opportunities_manage_own ON saved_opportunities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY applications_manage_own ON student_applications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY application_events_read_own ON application_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM student_applications sa
            WHERE sa.id = application_events.application_id
              AND sa.user_id = auth.uid())
  );

CREATE POLICY application_tasks_manage_own ON application_tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM student_applications sa
            WHERE sa.id = application_tasks.application_id
              AND sa.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM student_applications sa
            WHERE sa.id = application_tasks.application_id
              AND sa.user_id = auth.uid())
  );

CREATE POLICY resumes_manage_own ON resumes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY notifications_manage_own ON notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY notification_preferences_manage_own ON notification_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY notification_outbox_manage_own ON notification_outbox
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admin audit logs: only admins (enforced server-side; RLS is a secondary guard).
CREATE POLICY admin_audit_logs_admin_only ON admin_audit_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- Opportunities: authenticated users may read published opportunities.
CREATE POLICY opportunities_read_published ON opportunities
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY organisations_read ON organisations
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY opportunity_sources_read ON opportunity_sources
  FOR SELECT TO authenticated USING (is_active = TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- End of migration
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_sources ENABLE ROW LEVEL SECURITY;
  target_type VARCHAR(64) NOT NULL,
  target_id UUID,
  details JSONB,
  ip_address VARCHAR(64),
  user_agent VARCHAR(512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_id_idx ON admin_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_target_idx ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs(created_at);

CREATE INDEX IF NOT EXISTS resumes_user_id_idx ON resumes(user_id);
CREATE INDEX IF NOT EXISTS resumes_is_default_idx ON resumes(is_default);
);

CREATE INDEX IF NOT EXISTS saved_opportunities_user_id_idx ON saved_opportunities(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS saved_opportunities_user_id_opportunity_id_idx
  ON saved_opportunities(user_id, opportunity_id);
  role VARCHAR(64) NOT NULL DEFAULT 'provider',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (opportunity_id, organisation_id)
);

CREATE INDEX IF NOT EXISTS opportunity_organisations_opportunity_id_idx ON opportunity_organisations(opportunity_id);
CREATE INDEX IF NOT EXISTS opportunity_organisations_organisation_id_idx ON opportunity_organisations(organisation_id);
  type source_type NOT NULL,
  official_url VARCHAR(512),
  api_endpoint VARCHAR(512),
  auth_required BOOLEAN NOT NULL DEFAULT FALSE,
  api_key_reference VARCHAR(128),
  permitted_use TEXT,
  terms_of_service_url VARCHAR(512),
  retrieval_schedule VARCHAR(64),
  rate_limit VARCHAR(64),
  last_successful_sync TIMESTAMPTZ,
  last_failed_sync TIMESTAMPTZ,
  reliability_status reliability_status NOT NULL DEFAULT 'unknown',
  source_authority VARCHAR(64),
  administrator_owner VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS opportunity_sources_name_idx ON opportunity_sources(name);