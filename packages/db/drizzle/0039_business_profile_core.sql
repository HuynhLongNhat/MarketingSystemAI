ALTER TABLE "business_profiles"
  ADD COLUMN "business_name" varchar(200),
  ADD COLUMN "primary_industry" varchar(100),
  ADD COLUMN "business_model" varchar(16),
  ADD COLUMN "products_services" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "target_customers" text,
  ADD COLUMN "markets" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "competitive_advantages" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "priority_business_goals" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "current_challenges" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "development_stage" varchar(16);
