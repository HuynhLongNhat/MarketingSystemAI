
import {
  boolean,
  foreignKey,
  index,
  integer,
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
  "google",
  "groq",
  "deepseek",
  "mistral",
  "together",
  "fireworks",
  "cerebras",
  "xai",
  "ollama",
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

    encryptedApiKey: text("encrypted_api_key").notNull(),
    keyIv: text("key_iv").notNull(),
    keyAuthTag: text("key_auth_tag").notNull(),
    keyVersion: text("key_version")
      .notNull()
      .default("v1"),

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

    purpose: text("purpose").notNull(),

    connectionId: text("connection_id").notNull(),

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

export const AI_USAGE_STATUSES = [
  "success",
  "failed",
] as const;

export type AiUsageStatus =
  (typeof AI_USAGE_STATUSES)[number];

export const aiUsageLogs = pgTable(
  "ai_usage_logs",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    provider: text("provider").notNull(),

    modelId: text("model_id").notNull(),

    purpose: text("purpose").notNull(),

    status: text("status", {
      enum: AI_USAGE_STATUSES,
    }).notNull(),

    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    totalTokens: integer("total_tokens"),

    latencyMs: integer("latency_ms"),

    errorCode: text("error_code"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_usage_logs_org_created_idx")
      .on(table.organizationId, table.createdAt),

    index("ai_usage_logs_org_purpose_created_idx")
      .on(
        table.organizationId,
        table.purpose,
        table.createdAt,
      ),

    index("ai_usage_logs_org_status_created_idx")
      .on(
        table.organizationId,
        table.status,
        table.createdAt,
      ),
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

export type AiUsageLog =
  typeof aiUsageLogs.$inferSelect;

export type NewAiUsageLog =
  typeof aiUsageLogs.$inferInsert;
