
ALTER TABLE "knowledge_chunks"
ADD CONSTRAINT "knowledge_chunks_document_org_fk"
FOREIGN KEY ("document_id","organization_id")
REFERENCES "public"."knowledge_documents"("id","organization_id")
ON DELETE cascade ON UPDATE no action;
