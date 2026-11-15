-- A student tracks an opportunity once; subsequent requests reuse that record.
CREATE UNIQUE INDEX "student_applications_user_opportunity_idx" ON "student_applications" USING btree ("user_id", "opportunity_id");
