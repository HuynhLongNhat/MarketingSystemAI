import { bigint, index, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { organization } from "./schema.js";

export const BUSINESS_RISK_TOLERANCES = ["conservative", "balanced", "aggressive"] as const;
export type BusinessRiskTolerance = (typeof BUSINESS_RISK_TOLERANCES)[number];

export const businessProfiles = pgTable("business_profiles", {
  organizationId: text("organization_id").primaryKey().references(() => organization.id, { onDelete: "cascade" }),
  currency: varchar("currency", { length: 3 }).notNull().default("VND"),
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
