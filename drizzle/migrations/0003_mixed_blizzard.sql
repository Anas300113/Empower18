ALTER TABLE "opportunities" ADD COLUMN "category" varchar(64);--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "route" varchar(64);--> statement-breakpoint
CREATE INDEX "opportunities_category_idx" ON "opportunities" USING btree ("category");--> statement-breakpoint
CREATE INDEX "opportunities_route_idx" ON "opportunities" USING btree ("route");