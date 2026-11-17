-- Fix user_roles RLS policies for privilege escalation prevention

-- Drop existing policies on user_roles
DROP POLICY IF EXISTS user_roles_owner_read_policy ON user_roles;
DROP POLICY IF EXISTS user_roles_admin_insert_policy ON user_roles;

-- Allow authenticated users to see their own roles
CREATE POLICY user_roles_select_own ON user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins (users with admin role) to see all roles
CREATE POLICY user_roles_select_admin ON user_roles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Allow users to register their initial 'student' role
CREATE POLICY user_roles_insert_student ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND role = 'student'
  );

-- Allow admins to insert roles for others (priv establishment)
CREATE POLICY user_roles_insert_admin ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Allow admins to update any role
CREATE POLICY user_roles_admin_update ON user_roles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Allow users to update their own role (e.g., from 'student' to 'admin')
CREATE POLICY user_roles_self_update ON user_roles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);