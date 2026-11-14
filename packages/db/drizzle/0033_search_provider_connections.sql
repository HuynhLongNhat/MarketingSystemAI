CREATE TABLE "search_provider_connections" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "provider" text NOT NULL,
  "name" text NOT NULL,
  "encrypted_api_key" text NOT NULL,
  "key_iv" text NOT NULL,
  "key_auth_tag" text NOT NULL,
  "key_version" text DEFAULT 'v1' NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "search_provider_connections_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade
);
CREATE INDEX "search_provider_connections_org_idx" ON "search_provider_connections" ("organization_id");
CREATE UNIQUE INDEX "search_provider_connections_org_provider_name_uq" ON "search_provider_connections" ("organization_id", "provider", "name");
CREATE UNIQUE INDEX "search_provider_connections_id_org_uq" ON "search_provider_connections" ("id", "organization_id");
