CREATE TABLE "knowledge_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"chunk_id" text NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"dimensions" integer DEFAULT 1536 NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_embeddings" ADD CONSTRAINT "knowledge_embeddings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_embeddings" ADD CONSTRAINT "knowledge_embeddings_chunk_org_fk" FOREIGN KEY ("chunk_id","organization_id") REFERENCES "public"."knowledge_chunks"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_embeddings_chunk_model_uq" ON "knowledge_embeddings" USING btree ("chunk_id","provider","model_id");--> statement-breakpoint
CREATE INDEX "knowledge_embeddings_org_model_idx" ON "knowledge_embeddings" USING btree ("organization_id","provider","model_id");--> statement-breakpoint
CREATE INDEX "knowledge_embeddings_org_chunk_idx" ON "knowledge_embeddings" USING btree ("organization_id","chunk_id");