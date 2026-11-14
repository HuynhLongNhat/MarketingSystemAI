import { index, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("ceo_plans_task_unique").on(table.taskId),
  index("ceo_plans_org_created_idx").on(table.organizationId, table.createdAt),
  index("ceo_plans_org_status_idx").on(table.organizationId, table.approvalStatus),
]);

export type CeoPlan = typeof ceoPlans.$inferSelect;
