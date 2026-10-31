ALTER TABLE "contact_sessions"
  ALTER COLUMN "name" DROP NOT NULL;

ALTER TABLE "contact_sessions"
  ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "contact_sessions"
  ADD COLUMN "phone" text;

ALTER TABLE "contact_sessions"
  ADD COLUMN "visitor_type" text
  DEFAULT 'guest' NOT NULL;

UPDATE "contact_sessions"
SET "visitor_type" = 'identified'
WHERE "name" IS NOT NULL
  AND "email" IS NOT NULL;