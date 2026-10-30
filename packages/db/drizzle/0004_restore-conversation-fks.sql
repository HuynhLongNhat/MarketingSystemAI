-- Custom SQL migration file, put your code below! --
ALTER TABLE "contact_sessions"
ADD CONSTRAINT "contact_sessions_organization_id_organization_id_fk"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organization"("id")
ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "conversations"
ADD CONSTRAINT "conversations_organization_id_organization_id_fk"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organization"("id")
ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "conversations"
ADD CONSTRAINT "conversations_session_org_fk"
FOREIGN KEY ("contact_session_id", "organization_id")
REFERENCES "public"."contact_sessions"("id", "organization_id")
ON DELETE CASCADE;