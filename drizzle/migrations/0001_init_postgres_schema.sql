-- Migration: 0001_init_postgres_schema
-- Description: Initial PostgreSQL schema for Empower18
-- Converts from MySQL to PostgreSQL (pg-core dialect)
--
-- This migration creates the foundational tables:
--   - users (legacy, kept during Manus OAuth -> Supabase Auth transition)
--   - auth_users (reference to Supabase auth.users)
--   - user_roles (server-controlled RBAC)
--   - profiles (core user profile)
--   - student_profiles (onboarding data)
--   - organisations + opportunity_organisations
--   - opportunity_sources (source registry)
--   - opportunities (canonical opportunity records)
--   - saved_opportunities
--   - student_applications + application_events + application_tasks
--   - notifications + notification_preferences + notification_outbox
--   - admin_audit_logs
--
-- Review before applying. Do not run destructive operations on production.

-- Enable UUID generation (pgcrypto is available by default on Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ------------------------------------------------------------------
-- 1. Identity & roles
-- ------------------------------------------------------------------

-- Reference to Supabase Auth's auth.users (managed by Supabase, not owned by us)
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY,
  email VARCHAR(320),
  raw_user_meta_data JSONB,
  created_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS auth_users_email_idx ON auth_users(email);

-- Server-controlled roles (never trusted from client)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'student',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES auth_users(id)
);

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_idx ON user_roles(user_id, role);

-- ------------------------------------------------------------------
-- 2. Profiles
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  display_name VARCHAR(120),
  timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/London',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

-- Student onboarding data (minimal PII, progressive collection)
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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

-- ------------------------------------------------------------------
-- 0. Legacy users table (MySQL -> PostgreSQL transition)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  open_id VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  login_method VARCHAR(64),
  role VARCHAR(64) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_signed_in TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_open_id_idx ON users(open_id);

-- ------------------------------------------------------------------
-- 3. Organisations
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32),
  website VARCHAR(512),
  description TEXT,
  location VARCHAR(255),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS organisations_name_idx ON organisations(name);

CREATE TABLE IF NOT EXISTS opportunity_organisations (
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  role VARCHAR(64) NOT NULL DEFAULT 'provider',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (opportunity_id, organisation_id)
);

CREATE INDEX IF NOT EXISTS opportunity_organisations_opportunity_id_idx ON opportunity_organisations(opportunity_id);
CREATE INDEX IF NOT EXISTS opportunity_organisations_organisation_id_idx ON opportunity_organisations(organisation_id);

-- ------------------------------------------------------------------
-- 4. Opportunity sources (registry)
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS opportunity_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  organisation VARCHAR(255),
  type VARCHAR(32) NOT NULL,
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
  reliability_status VARCHAR(32) NOT NULL DEFAULT 'unknown',
  source_authority VARCHAR(64),
  administrator_owner VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS opportunity_sources_name_idx ON opportunity_sources(name);

-- ------------------------------------------------------------------
-- 5. Opportunities
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  summary TEXT,
  type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
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
  verified_by UUID REFERENCES auth_users(id) ON DELETE SET NULL,
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

-- ------------------------------------------------------------------
-- 6. Saved opportunities
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS saved_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS saved_opportunities_user_id_idx ON saved_opportunities(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS saved_opportunities_user_id_opportunity_id_idx
  ON saved_opportunities(user_id, opportunity_id);

-- ------------------------------------------------------------------
-- 7. Applications
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS student_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  stage VARCHAR(32) NOT NULL DEFAULT 'interested',
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
  stage VARCHAR(32) NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth_users(id),
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


-- ------------------------------------------------------------------
-- 8. Notifications
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL,
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
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  link_url VARCHAR(1024),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
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

-- ------------------------------------------------------------------
-- 9. Admin audit log
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE SET NULL,
  action VARCHAR(128) NOT NULL,
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

-- ------------------------------------------------------------------
-- End of migration
-- ------------------------------------------------------------------


