
CREATE TABLE "ai_model_defaults" (
    "id" text PRIMARY KEY NOT NULL,
    "organization_id" text NOT NULL,
    "purpose" text NOT NULL,
    "connection_id" text NOT NULL,
    "model_id" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_provider_connections" (
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
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_model_defaults"
ADD CONSTRAINT "ai_model_defaults_organization_id_organization_id_fk"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organization"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_provider_connections"
ADD CONSTRAINT "ai_provider_connections_organization_id_organization_id_fk"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organization"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_provider_connections_id_org_uq"
ON "ai_provider_connections" USING btree ("id", "organization_id");
--> statement-breakpoint
ALTER TABLE "ai_model_defaults"
ADD CONSTRAINT "ai_model_defaults_connection_org_fk"
FOREIGN KEY ("connection_id", "organization_id")
REFERENCES "public"."ai_provider_connections"("id", "organization_id")
ON DELETE restrict
ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_model_defaults_org_purpose_uq"
ON "ai_model_defaults" USING btree ("organization_id", "purpose");
--> statement-breakpoint
CREATE INDEX "ai_model_defaults_connection_idx"
ON "ai_model_defaults" USING btree ("connection_id");
--> statement-breakpoint
CREATE INDEX "ai_provider_connections_org_idx"
ON "ai_provider_connections" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_provider_connections_org_provider_name_uq"
ON "ai_provider_connections" USING btree ("organization_id", "provider", "name");
