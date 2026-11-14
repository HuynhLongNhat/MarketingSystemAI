CREATE TABLE "business_profiles" (
  "organization_id" text PRIMARY KEY NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "currency" varchar(3) NOT NULL DEFAULT 'VND',
  "marketing_budget_vnd" bigint,
  "paid_ads_budget_vnd" bigint,
  "budget_period_days" integer,
  "team_size" integer,
  "available_hours_per_week" integer,
  "available_tools" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "available_channels" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "risk_tolerance" text NOT NULL DEFAULT 'balanced',
  "constraints_note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "business_profiles_budget_non_negative" CHECK ((marketing_budget_vnd IS NULL OR marketing_budget_vnd >= 0) AND (paid_ads_budget_vnd IS NULL OR paid_ads_budget_vnd >= 0)),
  CONSTRAINT "business_profiles_period_positive" CHECK (budget_period_days IS NULL OR budget_period_days > 0),
  CONSTRAINT "business_profiles_team_non_negative" CHECK (team_size IS NULL OR team_size >= 0),
  CONSTRAINT "business_profiles_hours_non_negative" CHECK (available_hours_per_week IS NULL OR available_hours_per_week >= 0),
  CONSTRAINT "business_profiles_ads_within_marketing" CHECK (paid_ads_budget_vnd IS NULL OR marketing_budget_vnd IS NULL OR paid_ads_budget_vnd <= marketing_budget_vnd)
);
CREATE INDEX "business_profiles_updated_idx" ON "business_profiles" ("updated_at");
