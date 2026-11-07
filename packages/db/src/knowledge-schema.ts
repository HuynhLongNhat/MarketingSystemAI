
import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization } from "./schema.js";
import {
  KNOWLEDGE_EMBEDDING_STATUSES,
} from "./knowledge-connectors-schema.js";

export const KNOWLEDGE_DOCUMENT_STATUSES = [
  "pending",
  "processing",
  "ready",
  "failed",
] as const;

export type KnowledgeDocumentStatus =
  (typeof KNOWLEDGE_DOCUMENT_STATUSES)[number];

// Existing FAQ knowledge entries.
// Keep this table to preserve the current Customer Support FAQ feature.
export const knowledgeEntries = pgTable(
  "knowledge_entries",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    question: text("question").notNull(),

    answer: text("answer").notNull(),

    category: text("category"),

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
    index("knowledge_entries_org_idx").on(
      table.organizationId,
    ),
  ],
);

// Uploaded knowledge documents.
export const knowledgeDocuments = pgTable(
  "knowledge_documents",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    title: text("title").notNull(),

    sourceType: text("source_type").notNull(),

    sourceName: text("source_name"),

    mimeType: text("mime_type"),

    status: text("status")
      .$type<KnowledgeDocumentStatus>()
      .notNull()
      .default("pending"),

    errorMessage: text("error_message"),

    sourceGeneration: integer("source_generation")
      .notNull()
      .default(0),

    embeddingStatus: text("embedding_status", {
      enum: KNOWLEDGE_EMBEDDING_STATUSES,
    })
      .notNull()
      .default("waiting"),

    embeddingToken: text("embedding_token"),

    embeddingQueuedAt: timestamp("embedding_queued_at", {
      withTimezone: true,
    }),

    embeddingStartedAt: timestamp("embedding_started_at", {
      withTimezone: true,
    }),

    embeddingCompletedAt: timestamp("embedding_completed_at", {
      withTimezone: true,
    }),

    embeddingErrorMessage: text("embedding_error_message"),

    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

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
    index("knowledge_documents_org_idx").on(
      table.organizationId,
    ),

    index("knowledge_documents_org_status_idx").on(
      table.organizationId,
      table.status,
    ),

    uniqueIndex("knowledge_documents_id_org_uq").on(
      table.id,
      table.organizationId,
    ),
  ],
);

// Text chunks extracted from knowledge documents.
// Embedding/vector fields will be added in a later RAG task,
// after confirming the embedding model and vector dimensions.
export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id").notNull(),

    documentId: text("document_id").notNull(),

    chunkIndex: integer("chunk_index").notNull(),

    content: text("content").notNull(),

    tokenCount: integer("token_count"),

    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

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
    index("knowledge_chunks_org_document_idx").on(
      table.organizationId,
      table.documentId,
    ),

    uniqueIndex("knowledge_chunks_document_index_uq").on(
      table.documentId,
      table.chunkIndex,
    ),

    uniqueIndex("knowledge_chunks_id_org_uq").on(
      table.id,
      table.organizationId,
    ),

    // Ensure a chunk can only reference a document
    // belonging to the same organization.
    foreignKey({
      name: "knowledge_chunks_document_org_fk",
      columns: [
        table.documentId,
        table.organizationId,
      ],
      foreignColumns: [
        knowledgeDocuments.id,
        knowledgeDocuments.organizationId,
      ],
    }).onDelete("cascade"),
  ],
);

export type KnowledgeEntry =
  typeof knowledgeEntries.$inferSelect;

export type NewKnowledgeEntry =
  typeof knowledgeEntries.$inferInsert;

export type KnowledgeDocument =
  typeof knowledgeDocuments.$inferSelect;

export type NewKnowledgeDocument =
  typeof knowledgeDocuments.$inferInsert;

export type KnowledgeChunk =
  typeof knowledgeChunks.$inferSelect;

export type NewKnowledgeChunk =
  typeof knowledgeChunks.$inferInsert;
