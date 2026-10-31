ALTER TABLE "conversation_messages"
ADD COLUMN "client_message_id" text;

CREATE UNIQUE INDEX "conversation_messages_idempotency_unique"
ON "conversation_messages" (
  "organization_id",
  "conversation_id",
  "client_message_id"
);