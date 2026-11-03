ALTER TABLE "conversations"
ADD COLUMN "assigned_to_user_id" text;

--> statement-breakpoint

ALTER TABLE "conversations"
ADD COLUMN "assigned_at" timestamp with time zone;

--> statement-breakpoint

ALTER TABLE "conversations"
ADD CONSTRAINT "conversations_assigned_to_user_id_user_id_fk"
FOREIGN KEY ("assigned_to_user_id")
REFERENCES "public"."user"("id")
ON DELETE SET NULL
ON UPDATE NO ACTION;

--> statement-breakpoint

CREATE INDEX "conversations_org_assignee_idx"
ON "conversations" USING btree ("organization_id", "assigned_to_user_id");