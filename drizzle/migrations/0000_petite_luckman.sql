
--> statement-breakpoint
-- Supabase RLS: user-scoped data is owned by auth.uid(). The application server
-- uses a privileged connection and must continue enforcing the same ownership
-- rules in its routers; RLS is an additional database boundary for client use.
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
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_sources ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY profiles_owner_policy ON profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY student_profiles_owner_policy ON student_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_roles_owner_read_policy ON user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY saved_opportunities_owner_policy ON saved_opportunities
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY student_applications_owner_policy ON student_applications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY application_events_owner_read_policy ON application_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM student_applications
    WHERE student_applications.id = application_events.application_id
      AND student_applications.user_id = auth.uid()
  ));
CREATE POLICY application_tasks_owner_policy ON application_tasks
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM student_applications
    WHERE student_applications.id = application_tasks.application_id
      AND student_applications.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM student_applications
    WHERE student_applications.id = application_tasks.application_id
      AND student_applications.user_id = auth.uid()
  ));
CREATE POLICY resumes_owner_policy ON resumes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY notifications_owner_policy ON notifications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY notification_preferences_owner_policy ON notification_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY notification_outbox_owner_policy ON notification_outbox
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY opportunities_published_read_policy ON opportunities
  FOR SELECT TO authenticated
  USING (is_published = TRUE);
CREATE POLICY organisations_authenticated_read_policy ON organisations
  FOR SELECT TO authenticated
  USING (TRUE);
CREATE POLICY opportunity_organisations_authenticated_read_policy ON opportunity_organisations
  FOR SELECT TO authenticated
  USING (TRUE);
CREATE POLICY opportunity_sources_active_read_policy ON opportunity_sources
  FOR SELECT TO authenticated
  USING (is_active = TRUE);
CREATE POLICY admin_audit_logs_admin_policy ON admin_audit_logs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));
