import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization } from "./schema.js";

export const WEBSITE_PROJECT_STATUSES = [
  "draft",
  "queued",
  "generating",
  "validating",
  "ready",
  "failed",
  "cancelled",
] as const;

export type WebsiteProjectStatus = (typeof WEBSITE_PROJECT_STATUSES)[number];

export const WEBSITE_PROJECT_TYPES = ["landing_page", "custom"] as const;
export type WebsiteProjectType = (typeof WEBSITE_PROJECT_TYPES)[number];

/** Website content is structured data, never arbitrary HTML or source code. */
export type WebsiteProjectConfig = Record<string, unknown>;

export const websiteProjects = pgTable(
  "website_projects",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    projectType: text("project_type", { enum: WEBSITE_PROJECT_TYPES })
      .notNull()
      .default("landing_page"),
    templateId: text("template_id"),
    websiteConfig: jsonb("website_config")
      .$type<WebsiteProjectConfig>()
      .notNull()
      .default({}),
    status: text("status", { enum: WEBSITE_PROJECT_STATUSES })
      .notNull()
      .default("draft"),
    currentVersion: integer("current_version").notNull().default(0),
    lastGenerationError: text("last_generation_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("website_projects_id_org_unique").on(table.id, table.organizationId),
    index("website_projects_org_updated_idx").on(table.organizationId, table.updatedAt),
    index("website_projects_org_status_idx").on(table.organizationId, table.status),
  ],
);

export type WebsiteProject = typeof websiteProjects.$inferSelect;
export type NewWebsiteProject = typeof websiteProjects.$inferInsert;
