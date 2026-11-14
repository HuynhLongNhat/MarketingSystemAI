import { bigint, index, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { organization } from "./schema.js";

export const BUSINESS_RISK_TOLERANCES = ["conservative", "balanced", "aggressive"] as const;
export const BUSINESS_MODELS = ["b2b", "b2c", "b2b2c", "other"] as const;
export const BUSINESS_DEVELOPMENT_STAGES = ["idea", "early", "growth", "established", "transformation", "other"] as const;
export type BusinessRiskTolerance = (typeof BUSINESS_RISK_TOLERANCES)[number];
export type BusinessModel = (typeof BUSINESS_MODELS)[number];
export type BusinessDevelopmentStage = (typeof BUSINESS_DEVELOPMENT_STAGES)[number];

export const businessProfiles = pgTable("business_profiles", {
  organizationId: text("organization_id").primaryKey().references(() => organization.id, { onDelete: "cascade" }),
  currency: varchar("currency", { length: 3 }).notNull().default("VND"),
  businessName: varchar("business_name", { length: 200 }),
  primaryIndustry: varchar("primary_industry", { length: 100 }),
  businessModel: varchar("business_model", { length: 16, enum: BUSINESS_MODELS }),
  productsServices: jsonb("products_services").$type<string[]>().notNull().default([]),
  targetCustomers: text("target_customers"),
  markets: jsonb("markets").$type<string[]>().notNull().default([]),
  competitiveAdvantages: jsonb("competitive_advantages").$type<string[]>().notNull().default([]),
  priorityBusinessGoals: jsonb("priority_business_goals").$type<string[]>().notNull().default([]),
  currentChallenges: jsonb("current_challenges").$type<string[]>().notNull().default([]),
  developmentStage: varchar("development_stage", { length: 16, enum: BUSINESS_DEVELOPMENT_STAGES }),
  marketingBudgetVnd: bigint("marketing_budget_vnd", { mode: "number" }),
  paidAdsBudgetVnd: bigint("paid_ads_budget_vnd", { mode: "number" }),
  budgetPeriodDays: integer("budget_period_days"),
  teamSize: integer("team_size"),
  availableHoursPerWeek: integer("available_hours_per_week"),
  availableTools: jsonb("available_tools").$type<string[]>().notNull().default([]),
  availableChannels: jsonb("available_channels").$type<string[]>().notNull().default([]),
  riskTolerance: text("risk_tolerance", { enum: BUSINESS_RISK_TOLERANCES }).notNull().default("balanced"),
  constraintsNote: text("constraints_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("business_profiles_updated_idx").on(table.updatedAt)]);

export type BusinessProfile = typeof businessProfiles.$inferSelect;
