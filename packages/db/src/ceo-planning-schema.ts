import { foreignKey, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { organization, user } from "./schema.js";
import { aiAgents } from "./agents-schema.js";
import { aiTasks } from "./tasks-schema.js";

export const CEO_PLAN_APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type CeoPlanApprovalStatus = (typeof CEO_PLAN_APPROVAL_STATUSES)[number];

export const ceoPlans = pgTable("ceo_plans", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "restrict" }),
  ceoAgentId: text("ceo_agent_id").references(() => aiAgents.id, { onDelete: "restrict" }),
  taskId: text("task_id").references(() => aiTasks.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 200 }).notNull(),
  objective: text("objective").notNull(),
  /** Per-plan reference data; it never modifies the organization's profile. */
  additionalContext: text("additional_context"),
  /** Immutable, sanitized data that was supplied to the CEO prompt. */
  businessProfileSnapshot: jsonb("business_profile_snapshot").$type<Record<string, unknown> | null>(),
  businessProfileSnapshotAt: timestamp("business_profile_snapshot_at", { withTimezone: true }),
  contextVersion: varchar("context_version", { length: 32 }),
  structuredPlan: jsonb("structured_plan").$type<Record<string, unknown> | null>(),
  structuredPlanVersion: varchar("structured_plan_version", { length: 32 }),
  generationSettings: jsonb("generation_settings").$type<Record<string, unknown> | null>(),
  /** Immutable execution routing metadata; never contains provider credentials. */
  executionSource: jsonb("execution_source").$type<Record<string, unknown> | null>(),
  approvalStatus: varchar("approval_status", { length: 16, enum: CEO_PLAN_APPROVAL_STATUSES }).notNull().default("pending"),
  decisionNote: text("decision_note"),
  decidedBy: text("decided_by").references(() => user.id, { onDelete: "restrict" }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  /** A failed planning request may be manually retried once per run. */
  retryOfPlanId: text("retry_of_plan_id"),
  retryPlanId: text("retry_plan_id"),
  retryStartedAt: timestamp("retry_started_at", { withTimezone: true }),
  retryCount: integer("retry_count").notNull().default(0),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: text("deleted_by").references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.retryOfPlanId], foreignColumns: [table.id], name: "ceo_plans_retry_of_plan_id_fkey" }).onDelete("restrict"),
  uniqueIndex("ceo_plans_task_unique").on(table.taskId),
  uniqueIndex("ceo_plans_retry_of_unique").on(table.retryOfPlanId),
  index("ceo_plans_org_created_idx").on(table.organizationId, table.createdAt),
  index("ceo_plans_org_status_idx").on(table.organizationId, table.approvalStatus),
  index("ceo_plans_org_deleted_idx").on(table.organizationId, table.deletedAt),
]);

/** Immutable, independently generated review of one CEO plan version. */
export const ceoPlanReviews = pgTable("ceo_plan_reviews", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => ceoPlans.id, { onDelete: "cascade" }),
  taskId: text("task_id").notNull().references(() => aiTasks.id, { onDelete: "restrict" }),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "restrict" }),
  /** Agent selected by the owner to independently review this plan. Legacy reviews remain null. */
  reviewerAgentId: text("reviewer_agent_id").references(() => aiAgents.id, { onDelete: "set null" }),
  /** Immutable, display-safe reviewer identity retained even if an Agent is later removed. */
  reviewerAgentName: text("reviewer_agent_name"),
  reviewerAgentRole: text("reviewer_agent_role"),
  providerConnectionId: text("provider_connection_id").notNull(),
  modelId: text("model_id").notNull(),
  planVersion: varchar("plan_version", { length: 32 }),
  report: jsonb("report").$type<Record<string, unknown> | null>(),
  reportVersion: varchar("report_version", { length: 32 }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("ceo_plan_reviews_task_unique").on(table.taskId),
  index("ceo_plan_reviews_org_reviewer_created_idx").on(table.organizationId, table.reviewerAgentId, table.createdAt),
  index("ceo_plan_reviews_org_plan_created_idx").on(table.organizationId, table.planId, table.createdAt),
  uniqueIndex("ceo_plan_reviews_id_org_unique").on(table.id, table.organizationId),
]);

export type CeoPlan = typeof ceoPlans.$inferSelect;
export type CeoPlanReview = typeof ceoPlanReviews.$inferSelect;
