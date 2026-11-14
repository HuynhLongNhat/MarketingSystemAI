import { foreignKey, index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { organization, user } from "./schema.js";
import { aiAgents } from "./agents-schema.js";
import { aiTasks } from "./tasks-schema.js";

export const CEO_PLAN_APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type CeoPlanApprovalStatus = (typeof CEO_PLAN_APPROVAL_STATUSES)[number];

export const ceoPlans = pgTable("ceo_plans", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "restrict" }),
  ceoAgentId: text("ceo_agent_id").notNull().references(() => aiAgents.id, { onDelete: "restrict" }),
  taskId: text("task_id").notNull().references(() => aiTasks.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 200 }).notNull(),
  objective: text("objective").notNull(),
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

export type CeoPlan = typeof ceoPlans.$inferSelect;
