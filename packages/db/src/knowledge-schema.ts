
import {
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { organization } from "./schema.js";

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

export type KnowledgeEntry =
  typeof knowledgeEntries.$inferSelect;

export type NewKnowledgeEntry =
  typeof knowledgeEntries.$inferInsert;
