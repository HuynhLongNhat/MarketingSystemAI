import {
  boolean,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization } from "./schema.js";
import { aiProviderConnections } from "./ai-schema.js";

export const AGENT_STATUSES = [
  "draft",
  "active",
  "paused",
  "archived",
] as const;

export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const AGENT_CATEGORIES = [
  "marketing",
  "sales",
  "support",
  "research",
  "operations",
  "other",
] as const;

export type AgentCategory = (typeof AGENT_CATEGORIES)[number];

export type AgentToolConfig = {
  enabledTools: string[];
};

export const departments = pgTable(
  "departments",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),

    slug: text("slug").notNull(),

    description: text("description"),

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
    uniqueIndex("departments_org_slug_unique").on(
      table.organizationId,
      table.slug,
    ),

    uniqueIndex("departments_id_org_unique").on(table.id, table.organizationId),

    index("departments_org_idx").on(table.organizationId),
  ],
);

export const agentTemplates = pgTable(
  "agent_templates",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),

    name: text("name").notNull(),

    slug: text("slug").notNull(),

    category: text("category", {
      enum: AGENT_CATEGORIES,
    })
      .notNull()
      .default("other"),

    description: text("description"),

    systemPrompt: text("system_prompt").notNull(),

    version: text("version").notNull().default("1.0.0"),

    isPublished: boolean("is_published").notNull().default(false),

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
    index("agent_templates_org_idx").on(table.organizationId),

    index("agent_templates_category_idx").on(table.category),

    uniqueIndex("agent_templates_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
  ],
);

export const aiAgents = pgTable(
  "ai_agents",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    departmentId: text("department_id"),

    templateId: text("template_id"),

    name: text("name").notNull(),

    description: text("description"),

    role: text("role").notNull(),

    status: text("status", {
      enum: AGENT_STATUSES,
    })
      .notNull()
      .default("draft"),

    systemPrompt: text("system_prompt").notNull(),

    connectionId: text("connection_id"),

    modelId: text("model_id"),

    toolConfig: jsonb("tool_config")
      .$type<AgentToolConfig>()
      .notNull()
      .default({ enabledTools: [] }),

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
    foreignKey({
      name: "ai_agents_department_org_fk",
      columns: [table.departmentId, table.organizationId],
      foreignColumns: [departments.id, departments.organizationId],
    }).onDelete("restrict"),

    foreignKey({
      name: "ai_agents_connection_fk",
      columns: [table.connectionId],
      foreignColumns: [aiProviderConnections.id],
    }).onDelete("set null"),

    index("ai_agents_org_idx").on(table.organizationId),

    index("ai_agents_org_status_idx").on(table.organizationId, table.status),

    index("ai_agents_department_idx").on(table.departmentId),

    index("ai_agents_template_idx").on(table.templateId),
  ],
);

export type Department = typeof departments.$inferSelect;

export type NewDepartment = typeof departments.$inferInsert;

export type AgentTemplate = typeof agentTemplates.$inferSelect;

export type NewAgentTemplate = typeof agentTemplates.$inferInsert;

export type AiAgent = typeof aiAgents.$inferSelect;

export type NewAiAgent = typeof aiAgents.$inferInsert;
