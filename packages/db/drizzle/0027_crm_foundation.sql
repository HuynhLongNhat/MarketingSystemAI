CREATE TABLE "crm_contacts" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "display_name" text,
  "phone" text,
  "email" text,
  "avatar_url" text,
  "notes" text,
  "tags" text[] DEFAULT '{}' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_channel_identities" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "contact_id" text NOT NULL,
  "channel_type" text NOT NULL,
  "channel_connection_id" text DEFAULT 'default' NOT NULL,
  "external_user_id" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_conversation_contacts" (
  "conversation_id" text NOT NULL,
  "organization_id" text NOT NULL,
  "contact_id" text NOT NULL,
  "linked_at" timestamp with time zone DEFAULT now() NOT NULL,
  "linked_by_user_id" text
);
--> statement-breakpoint
CREATE TABLE "crm_leads" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "contact_id" text NOT NULL,
  "source_channel" text,
  "status" text DEFAULT 'new' NOT NULL,
  "owner_user_id" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "crm_channel_identities" ADD CONSTRAINT "crm_channel_identities_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "crm_channel_identities" ADD CONSTRAINT "crm_channel_identities_contact_org_fk" FOREIGN KEY ("contact_id","organization_id") REFERENCES "public"."crm_contacts"("id","organization_id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "crm_conversation_contacts" ADD CONSTRAINT "crm_conversation_contacts_conversation_org_fk" FOREIGN KEY ("conversation_id","organization_id") REFERENCES "public"."conversations"("id","organization_id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "crm_conversation_contacts" ADD CONSTRAINT "crm_conversation_contacts_contact_org_fk" FOREIGN KEY ("contact_id","organization_id") REFERENCES "public"."crm_contacts"("id","organization_id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "crm_conversation_contacts" ADD CONSTRAINT "crm_conversation_contacts_linked_by_user_id_user_id_fk" FOREIGN KEY ("linked_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_contact_org_fk" FOREIGN KEY ("contact_id","organization_id") REFERENCES "public"."crm_contacts"("id","organization_id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null;
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_contacts_id_org_uq" ON "crm_contacts" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE INDEX "crm_contacts_org_updated_idx" ON "crm_contacts" USING btree ("organization_id","updated_at");
--> statement-breakpoint
CREATE INDEX "crm_contacts_org_email_idx" ON "crm_contacts" USING btree ("organization_id","email");
--> statement-breakpoint
CREATE INDEX "crm_contacts_org_phone_idx" ON "crm_contacts" USING btree ("organization_id","phone");
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_channel_identity_external_uq" ON "crm_channel_identities" USING btree ("organization_id","channel_type","channel_connection_id","external_user_id");
--> statement-breakpoint
CREATE INDEX "crm_channel_identities_contact_idx" ON "crm_channel_identities" USING btree ("organization_id","contact_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_channel_identities_id_org_uq" ON "crm_channel_identities" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_conversation_contacts_conversation_org_uq" ON "crm_conversation_contacts" USING btree ("conversation_id","organization_id");
--> statement-breakpoint
CREATE INDEX "crm_conversation_contacts_contact_idx" ON "crm_conversation_contacts" USING btree ("organization_id","contact_id");
--> statement-breakpoint
CREATE INDEX "crm_leads_org_status_updated_idx" ON "crm_leads" USING btree ("organization_id","status","updated_at");
--> statement-breakpoint
CREATE INDEX "crm_leads_org_contact_idx" ON "crm_leads" USING btree ("organization_id","contact_id");
--> statement-breakpoint
CREATE INDEX "crm_leads_org_owner_idx" ON "crm_leads" USING btree ("organization_id","owner_user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_leads_id_org_uq" ON "crm_leads" USING btree ("id","organization_id");
