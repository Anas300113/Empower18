-- Security correction: role changes must never be self-service.
-- The 0006 migration accidentally allowed users to promote their own role and
-- introduced self-referential RLS checks. This migration replaces those
-- checks with a narrowly scoped SECURITY DEFINER predicate.

CREATE OR REPLACE FUNCTION public.has_current_user_role(required_role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = required_role
  );
$$;

REVOKE ALL ON FUNCTION public.has_current_user_role(public.user_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_current_user_role(public.user_role) TO authenticated;

-- Remove the unsafe and recursive policies introduced by earlier migrations.
DROP POLICY IF EXISTS user_roles_select_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_self_update ON public.user_roles;

-- Users may read their own roles. Administrators may read all roles.
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_roles_select_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_current_user_role('admin'::public.user_role));

-- A user may only create their own initial student role.
DROP POLICY IF EXISTS user_roles_insert_student ON public.user_roles;
CREATE POLICY user_roles_insert_student ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'student'::public.user_role
  );

-- Only an existing administrator may grant roles to other users.
CREATE POLICY user_roles_insert_admin ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_current_user_role('admin'::public.user_role));

-- Only an existing administrator may change role assignments.
-- The same predicate in WITH CHECK prevents changing the actor's own
-- privileges during the statement.
CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_current_user_role('admin'::public.user_role))
  WITH CHECK (public.has_current_user_role('admin'::public.user_role));

-- Intentionally no authenticated DELETE policy: role removal is a trusted
-- administrative operation and should be performed through the server.
