
CREATE TABLE "knowledge_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"document_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"token_count" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"source_type" text NOT NULL,
	"source_name" text,
	"mime_type" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_documents"
ADD CONSTRAINT "knowledge_documents_organization_id_organization_id_fk"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organization"("id")
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "knowledge_chunks_org_document_idx"
ON "knowledge_chunks" USING btree ("organization_id","document_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_chunks_document_index_uq"
ON "knowledge_chunks" USING btree ("document_id","chunk_index");
--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_chunks_id_org_uq"
ON "knowledge_chunks" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE INDEX "knowledge_documents_org_idx"
ON "knowledge_documents" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "knowledge_documents_org_status_idx"
ON "knowledge_documents" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_documents_id_org_uq"
ON "knowledge_documents" USING btree ("id","organization_id");
