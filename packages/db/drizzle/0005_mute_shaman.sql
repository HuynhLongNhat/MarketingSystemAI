
CREATE UNIQUE INDEX "conversations_id_org_unique"
ON "conversations" USING btree ("id","organization_id");
--> statement-breakpoint

CREATE TABLE "conversation_messages" (
    "id" text PRIMARY KEY NOT NULL,
    "organization_id" text NOT NULL,
    "conversation_id" text NOT NULL,
    "role" text NOT NULL,
    "content" text NOT NULL,
    "sender_id" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "conversation_messages"
ADD CONSTRAINT "conversation_messages_organization_id_organization_id_fk"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organization"("id")
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "conversation_messages"
ADD CONSTRAINT "conversation_messages_conversation_org_fk"
FOREIGN KEY ("conversation_id","organization_id")
REFERENCES "public"."conversations"("id","organization_id")
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "conversation_messages_org_conversation_created_idx"
ON "conversation_messages"
USING btree ("organization_id","conversation_id","created_at");
