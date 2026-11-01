
import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { organization } from "./schema.js";
import { aiAgents } from "./agents-schema.js";

/**
 * Mỗi Organization có tối đa một Agent CSKH
 * được gán chính thức cho website.
 *
 * Kiểm tra Agent thuộc cùng Organization ở service.
 * Khi xóa Agent, bản ghi gán cũng được xóa.
 */
export const customerSupportAssignments = pgTable(
  "customer_support_assignments",
  {
    organizationId: text("organization_id")
      .primaryKey()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    agentId: text("agent_id")
      .notNull()
      .references(() => aiAgents.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
);

export type CustomerSupportAssignment =
  typeof customerSupportAssignments.$inferSelect;

export type NewCustomerSupportAssignment =
  typeof customerSupportAssignments.$inferInsert;
