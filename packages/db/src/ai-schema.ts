
import {
  boolean,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization } from "./schema.js";

export const AI_PROVIDER_TYPES = [
  "openrouter",
  "openai",
  "anthropic",
  "openai_compatible",
] as const;

export type AiProviderType =
  (typeof AI_PROVIDER_TYPES)[number];

export const aiProviderConnections = pgTable(
  "ai_provider_connections",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    provider: text("provider", {
      enum: AI_PROVIDER_TYPES,
    }).notNull(),

    name: text("name").notNull(),

    // Chỉ lưu ciphertext, tuyệt đối không lưu key gốc.
    encryptedApiKey: text("encrypted_api_key").notNull(),
    keyIv: text("key_iv").notNull(),
    keyAuthTag: text("key_auth_tag").notNull(),
    keyVersion: text("key_version")
      .notNull()
      .default("v1"),

    // Enabled không có nghĩa là đã test kết nối.
    enabled: boolean("enabled").notNull().default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_provider_connections_org_idx")
      .on(table.organizationId),

    uniqueIndex("ai_provider_connections_org_provider_name_uq")
      .on(table.organizationId, table.provider, table.name),

    // Phục vụ FK kép: connection phải thuộc cùng organization.
    uniqueIndex("ai_provider_connections_id_org_uq")
      .on(table.id, table.organizationId),
  ],
);

export const aiModelDefaults = pgTable(
  "ai_model_defaults",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    // Ví dụ: customer_support, message_enhancement
    purpose: text("purpose").notNull(),

    connectionId: text("connection_id").notNull(),

    // Ví dụ: openai/gpt-4o-mini
    modelId: text("model_id").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ai_model_defaults_org_purpose_uq")
      .on(table.organizationId, table.purpose),

    index("ai_model_defaults_connection_idx")
      .on(table.connectionId),

    foreignKey({
      name: "ai_model_defaults_connection_org_fk",
      columns: [
        table.connectionId,
        table.organizationId,
      ],
      foreignColumns: [
        aiProviderConnections.id,
        aiProviderConnections.organizationId,
      ],
    }).onDelete("restrict"),
  ],
);

export type AiProviderConnection =
  typeof aiProviderConnections.$inferSelect;

export type NewAiProviderConnection =
  typeof aiProviderConnections.$inferInsert;

export type AiModelDefault =
  typeof aiModelDefaults.$inferSelect;

export type NewAiModelDefault =
  typeof aiModelDefaults.$inferInsert;
