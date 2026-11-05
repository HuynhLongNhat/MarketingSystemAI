
import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import {
  organization,
  user,
  conversations,
} from "./schema.js";

export const NOTIFICATION_TYPES = [
  "conversation_escalated",
  "conversation_assigned",
] as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),

    conversationId: text("conversation_id").notNull(),

    type: text("type", {
      enum: NOTIFICATION_TYPES,
    }).notNull(),

    title: text("title").notNull(),
    body: text("body").notNull(),

    readAt: timestamp("read_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "notifications_conversation_org_fk",
      columns: [
        table.conversationId,
        table.organizationId,
      ],
      foreignColumns: [
        conversations.id,
        conversations.organizationId,
      ],
    }).onDelete("cascade"),

    index("notifications_recipient_created_idx").on(
      table.organizationId,
      table.recipientUserId,
      table.createdAt,
    ),

    index("notifications_recipient_unread_idx").on(
      table.organizationId,
      table.recipientUserId,
      table.readAt,
    ),
  ],
);

export type Notification =
  typeof notifications.$inferSelect;

export type NewNotification =
  typeof notifications.$inferInsert;
