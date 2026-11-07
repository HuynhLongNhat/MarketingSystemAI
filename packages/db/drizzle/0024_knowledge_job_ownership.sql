ALTER TABLE "knowledge_external_sources"
  ADD COLUMN "ingestion_generation" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "ingestion_token" text,
  ADD COLUMN "ingestion_queued_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "knowledge_documents"
  ADD COLUMN "source_generation" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "embedding_status" text DEFAULT 'waiting' NOT NULL,
  ADD COLUMN "embedding_token" text,
  ADD COLUMN "embedding_queued_at" timestamp with time zone,
  ADD COLUMN "embedding_started_at" timestamp with time zone,
  ADD COLUMN "embedding_completed_at" timestamp with time zone,
  ADD COLUMN "embedding_error_message" text;
--> statement-breakpoint
CREATE INDEX "knowledge_documents_org_embedding_status_idx"
  ON "knowledge_documents" USING btree ("organization_id", "embedding_status");
