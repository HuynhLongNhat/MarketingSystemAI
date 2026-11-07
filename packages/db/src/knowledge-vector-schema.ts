
import {
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";

import { organization } from "./schema.js";
import { knowledgeChunks } from "./knowledge-schema.js";

export const KNOWLEDGE_EMBEDDING_DIMENSIONS = 1536;

export const knowledgeEmbeddings = pgTable(
  "knowledge_embeddings",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    chunkId: text("chunk_id").notNull(),

    provider: text("provider").notNull(),

    modelId: text("model_id").notNull(),

    dimensions: integer("dimensions")
      .notNull()
      .default(KNOWLEDGE_EMBEDDING_DIMENSIONS),

    embedding: vector("embedding", {
      dimensions: KNOWLEDGE_EMBEDDING_DIMENSIONS,
    }).notNull(),

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
    // Prevent referencing a chunk owned by
    // another organization.
    foreignKey({
      name: "knowledge_embeddings_chunk_org_fk",
      columns: [
        table.chunkId,
        table.organizationId,
      ],
      foreignColumns: [
        knowledgeChunks.id,
        knowledgeChunks.organizationId,
      ],
    }).onDelete("cascade"),

    // One vector per chunk, provider and model.
    uniqueIndex(
      "knowledge_embeddings_chunk_model_uq",
    ).on(
      table.chunkId,
      table.provider,
      table.modelId,
    ),

    index(
      "knowledge_embeddings_org_model_idx",
    ).on(
      table.organizationId,
      table.provider,
      table.modelId,
    ),

    index(
      "knowledge_embeddings_org_chunk_idx",
    ).on(
      table.organizationId,
      table.chunkId,
    ),

    // HNSW index is intentionally not included yet.
    // We will add it after validating the embedding
    // pipeline and model dimensions.
  ],
);

export type KnowledgeEmbedding =
  typeof knowledgeEmbeddings.$inferSelect;

export type NewKnowledgeEmbedding =
  typeof knowledgeEmbeddings.$inferInsert;
