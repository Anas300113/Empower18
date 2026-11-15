-- Preserve administrative audit records when a Supabase Auth user is removed.
-- The existing foreign key already specifies ON DELETE SET NULL, so the column
-- must also accept NULL for PostgreSQL to execute that action.
ALTER TABLE "admin_audit_logs" ALTER COLUMN "actor_user_id" DROP NOT NULL;
