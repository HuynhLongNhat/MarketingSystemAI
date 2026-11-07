
import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization } from "./schema.js";

export const KNOWLEDGE_CONNECTOR_TYPES = [
  "google_drive",
] as const;

export const KNOWLEDGE_CONNECTION_STATUSES = [
  "connected",
  "reauthorization_required",
  "disconnected",
] as const;

export const KNOWLEDGE_SOURCE_STATUSES = [
  "pending",
  "indexing",
  "ready",
  "failed",
  "removed",
] as const;

// OAuth connection owned by one organization.
// Never store plaintext OAuth tokens in this table.
export const knowledgeConnections = pgTable(
  "knowledge_connections",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    provider: text("provider", {
      enum: KNOWLEDGE_CONNECTOR_TYPES,
    }).notNull(),

    status: text("status", {
      enum: KNOWLEDGE_CONNECTION_STATUSES,
    })
      .notNull()
      .default("connected"),

    externalAccountId: text("external_account_id"),

    accountEmail: text("account_email"),

    // Encrypted using a dedicated OAuth token
    // encryption service in the next task.
    encryptedRefreshToken: text(
      "encrypted_refresh_token",
    ),

    refreshTokenIv: text("refresh_token_iv"),

    refreshTokenAuthTag: text(
      "refresh_token_auth_tag",
    ),

    tokenKeyVersion: text("token_key_version"),

    lastSyncAt: timestamp("last_sync_at", {
      withTimezone: true,
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
  (table) => [
    index("knowledge_connections_org_idx").on(
      table.organizationId,
    ),

    uniqueIndex(
      "knowledge_connections_id_org_uq",
    ).on(table.id, table.organizationId),
  ],
);

// Only files explicitly selected by the customer.
export const knowledgeExternalSources = pgTable(
  "knowledge_external_sources",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    connectionId: text("connection_id").notNull(),

    externalFileId: text("external_file_id")
      .notNull(),

    name: text("name").notNull(),

    mimeType: text("mime_type"),

    sourceVersion: text("source_version"),

    status: text("status", {
      enum: KNOWLEDGE_SOURCE_STATUSES,
    })
      .notNull()
      .default("pending"),

    lastIndexedAt: timestamp("last_indexed_at", {
      withTimezone: true,
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
  (table) => [
    foreignKey({
      name: "knowledge_sources_connection_org_fk",
      columns: [
        table.connectionId,
        table.organizationId,
      ],
      foreignColumns: [
        knowledgeConnections.id,
        knowledgeConnections.organizationId,
      ],
    }).onDelete("cascade"),

    uniqueIndex("knowledge_sources_file_uq").on(
      table.connectionId,
      table.externalFileId,
    ),

    index("knowledge_sources_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
  ],
);

export type KnowledgeConnection =
  typeof knowledgeConnections.$inferSelect;

export type NewKnowledgeConnection =
  typeof knowledgeConnections.$inferInsert;

export type KnowledgeExternalSource =
  typeof knowledgeExternalSources.$inferSelect;

export type NewKnowledgeExternalSource =
  typeof knowledgeExternalSources.$inferInsert;
