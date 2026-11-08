CREATE TABLE "website_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"project_type" text DEFAULT 'landing_page' NOT NULL,
	"template_id" text,
	"website_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_version" integer DEFAULT 0 NOT NULL,
	"last_generation_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "website_projects" ADD CONSTRAINT "website_projects_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "website_projects_id_org_unique" ON "website_projects" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE INDEX "website_projects_org_updated_idx" ON "website_projects" USING btree ("organization_id","updated_at");
--> statement-breakpoint
CREATE INDEX "website_projects_org_status_idx" ON "website_projects" USING btree ("organization_id","status");
