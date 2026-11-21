ALTER TABLE "opportunity_sources" ADD COLUMN "connector_id" varchar(64);--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "connector_config" jsonb;
