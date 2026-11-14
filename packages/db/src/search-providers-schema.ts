import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization } from "./schema.js";

/** Search connections are intentionally separate from LLM provider connections. */
export const SEARCH_PROVIDER_TYPES = ["tavily"] as const;
export type SearchProviderType = (typeof SEARCH_PROVIDER_TYPES)[number];

export const searchProviderConnections = pgTable(
  "search_provider_connections",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: SEARCH_PROVIDER_TYPES }).notNull(),
    name: text("name").notNull(),
    encryptedApiKey: text("encrypted_api_key").notNull(),
    keyIv: text("key_iv").notNull(),
    keyAuthTag: text("key_auth_tag").notNull(),
    keyVersion: text("key_version").notNull().default("v1"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("search_provider_connections_org_idx").on(table.organizationId),
    uniqueIndex("search_provider_connections_org_provider_name_uq").on(table.organizationId, table.provider, table.name),
    uniqueIndex("search_provider_connections_id_org_uq").on(table.id, table.organizationId),
  ],
);

export type SearchProviderConnection = typeof searchProviderConnections.$inferSelect;
export type NewSearchProviderConnection = typeof searchProviderConnections.$inferInsert;
