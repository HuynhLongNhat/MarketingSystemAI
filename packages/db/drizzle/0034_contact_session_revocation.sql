ALTER TABLE "contact_sessions" ADD COLUMN "revoked_at" timestamp with time zone;
CREATE INDEX "contact_sessions_active_idx" ON "contact_sessions" ("organization_id", "revoked_at", "expires_at");
