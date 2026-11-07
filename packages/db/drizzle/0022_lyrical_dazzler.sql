
CREATE TABLE "knowledge_connections" (
    "id" text PRIMARY KEY NOT NULL,
    "organization_id" text NOT NULL,
    "provider" text NOT NULL,
    "status" text DEFAULT 'connected' NOT NULL,
    "external_account_id" text,
    "account_email" text,
    "encrypted_refresh_token" text,
    "refresh_token_iv" text,
    "refresh_token_auth_tag" text,
    "token_key_version" text,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint

CREATE TABLE "knowledge_external_sources" (
    "id" text PRIMARY KEY NOT NULL,
    "organization_id" text NOT NULL,
    "connection_id" text NOT NULL,
    "external_file_id" text NOT NULL,
    "name" text NOT NULL,
    "mime_type" text,
    "source_version" text,
    "status" text DEFAULT 'pending' NOT NULL,
    "last_indexed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint

ALTER TABLE "knowledge_connections"
ADD CONSTRAINT "knowledge_connections_organization_id_organization_id_fk"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organization"("id")
ON DELETE cascade
ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "knowledge_external_sources"
ADD CONSTRAINT "knowledge_external_sources_organization_id_organization_id_fk"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organization"("id")
ON DELETE cascade
ON UPDATE no action;

--> statement-breakpoint

-- Create unique index BEFORE the composite foreign key.
CREATE UNIQUE INDEX "knowledge_connections_id_org_uq"
ON "knowledge_connections"
USING btree ("id", "organization_id");

--> statement-breakpoint

ALTER TABLE "knowledge_external_sources"
ADD CONSTRAINT "knowledge_sources_connection_org_fk"
FOREIGN KEY ("connection_id", "organization_id")
REFERENCES "public"."knowledge_connections"("id", "organization_id")
ON DELETE cascade
ON UPDATE no action;

--> statement-breakpoint

CREATE INDEX "knowledge_connections_org_idx"
ON "knowledge_connections"
USING btree ("organization_id");

--> statement-breakpoint

CREATE UNIQUE INDEX "knowledge_sources_file_uq"
ON "knowledge_external_sources"
USING btree ("connection_id", "external_file_id");

--> statement-breakpoint

CREATE INDEX "knowledge_sources_org_status_idx"
ON "knowledge_external_sources"
USING btree ("organization_id", "status");
