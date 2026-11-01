
CREATE TABLE "agent_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"description" text,
	"system_prompt" text NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agents" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"department_id" text,
	"template_id" text,
	"name" text NOT NULL,
	"description" text,
	"role" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"system_prompt" text NOT NULL,
	"connection_id" text,
	"model_id" text,
	"tool_config" jsonb DEFAULT '{"enabledTools":[]}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "departments_id_org_unique"
ON "departments" USING btree ("id","organization_id");
--> statement-breakpoint
ALTER TABLE "agent_templates"
ADD CONSTRAINT "agent_templates_organization_id_organization_id_fk"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organization"("id")
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_agents"
ADD CONSTRAINT "ai_agents_organization_id_organization_id_fk"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organization"("id")
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_agents"
ADD CONSTRAINT "ai_agents_department_org_fk"
FOREIGN KEY ("department_id","organization_id")
REFERENCES "public"."departments"("id","organization_id")
ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_agents"
ADD CONSTRAINT "ai_agents_connection_fk"
FOREIGN KEY ("connection_id")
REFERENCES "public"."ai_provider_connections"("id")
ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "departments"
ADD CONSTRAINT "departments_organization_id_organization_id_fk"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organization"("id")
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "agent_templates_org_idx"
ON "agent_templates" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "agent_templates_category_idx"
ON "agent_templates" USING btree ("category");
--> statement-breakpoint
CREATE UNIQUE INDEX "agent_templates_id_org_unique"
ON "agent_templates" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE INDEX "ai_agents_org_idx"
ON "ai_agents" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "ai_agents_org_status_idx"
ON "ai_agents" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "ai_agents_department_idx"
ON "ai_agents" USING btree ("department_id");
--> statement-breakpoint
CREATE INDEX "ai_agents_template_idx"
ON "ai_agents" USING btree ("template_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "departments_org_slug_unique"
ON "departments" USING btree ("organization_id","slug");
--> statement-breakpoint

--> statement-breakpoint
CREATE INDEX "departments_org_idx"
ON "departments" USING btree ("organization_id");
