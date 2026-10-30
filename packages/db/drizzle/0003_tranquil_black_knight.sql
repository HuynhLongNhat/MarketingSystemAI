
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
CREATE UNIQUE INDEX "contact_sessions_id_org_unique"
ON "contact_sessions" USING btree ("id","organization_id");
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
