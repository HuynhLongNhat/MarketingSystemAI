CREATE TABLE "ai_usage_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"purpose" text NOT NULL,
	"status" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"latency_ms" integer,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_quotas" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"monthly_token_limit" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"reserved_tokens" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "widget_settings" ADD COLUMN "allowed_origins" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_quotas" ADD CONSTRAINT "ai_usage_quotas_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_reservations" ADD CONSTRAINT "ai_usage_reservations_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_logs_org_created_idx" ON "ai_usage_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_org_purpose_created_idx" ON "ai_usage_logs" USING btree ("organization_id","purpose","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_org_status_created_idx" ON "ai_usage_logs" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_usage_quotas_org_uq" ON "ai_usage_quotas" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_usage_reservations_org_period_idx" ON "ai_usage_reservations" USING btree ("organization_id","period_start");--> statement-breakpoint
CREATE INDEX "ai_usage_reservations_expires_idx" ON "ai_usage_reservations" USING btree ("expires_at");