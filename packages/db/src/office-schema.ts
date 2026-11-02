
import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization } from "./schema.js";
import { aiAgents } from "./agents-schema.js";

export const officeDeskAssignments = pgTable(
  "office_desk_assignments",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    agentId: text("agent_id").notNull(),

    deskId: text("desk_id").notNull(),

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
  (table) => [
    // Prevent assigning an agent from another organization.
    foreignKey({
      name: "office_assignment_agent_org_fk",
      columns: [
        table.agentId,
        table.organizationId,
      ],
      foreignColumns: [
        aiAgents.id,
        aiAgents.organizationId,
      ],
    }).onDelete("cascade"),

    // Each desk belongs to one agent per organization.
    uniqueIndex("office_assignment_org_desk_unique").on(
      table.organizationId,
      table.deskId,
    ),

    // Each agent can occupy only one desk.
    uniqueIndex("office_assignment_org_agent_unique").on(
      table.organizationId,
      table.agentId,
    ),

    index("office_assignment_org_idx").on(
      table.organizationId,
    ),
  ],
);

export type OfficeDeskAssignment =
  typeof officeDeskAssignments.$inferSelect;

export type NewOfficeDeskAssignment =
  typeof officeDeskAssignments.$inferInsert;
