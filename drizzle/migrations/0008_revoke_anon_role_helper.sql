-- The role-check helper is used only by authenticated RLS policies.
-- Supabase default function grants may include anon, so remove that access.
REVOKE ALL ON FUNCTION public.has_current_user_role(public.user_role) FROM anon;
