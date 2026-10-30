CREATE TABLE "contact_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"contact_session_id" text NOT NULL,
	"thread_id" text,
	"status" text DEFAULT 'unresolved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_thread_id_unique" UNIQUE("thread_id")
);
--> statement-breakpoint
ALTER TABLE "contact_sessions" ADD CONSTRAINT "contact_sessions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_session_org_fk" FOREIGN KEY ("contact_session_id","organization_id") REFERENCES "public"."contact_sessions"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_sessions_org_idx" ON "contact_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contact_sessions_expires_idx" ON "contact_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_sessions_id_org_unique" ON "contact_sessions" USING btree ("id","organization_id");--> statement-breakpoint
CREATE INDEX "conversations_org_status_idx" ON "conversations" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "conversations_session_idx" ON "conversations" USING btree ("contact_session_id");--> statement-breakpoint
CREATE INDEX "conversations_org_created_idx" ON "conversations" USING btree ("organization_id","created_at");

--> statement-breakpoint
ALTER TABLE "conversations"
ADD CONSTRAINT "conversations_status_check"
CHECK ("status" IN ('unresolved', 'escalated', 'resolved'));