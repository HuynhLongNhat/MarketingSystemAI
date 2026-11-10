import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { conversations, organization, user } from "./schema.js";

export const CRM_CHANNEL_TYPES = [
  "widget",
  "zalo_oa",
  "facebook_messenger",
] as const;

export type CrmChannelType = (typeof CRM_CHANNEL_TYPES)[number];

export const CRM_LEAD_STATUSES = [
  "new",
  "qualified",
  "disqualified",
  "converted",
] as const;

export type CrmLeadStatus = (typeof CRM_LEAD_STATUSES)[number];

/** A customer record. It is deliberately separate from Better Auth users and widget sessions. */
export const crmContacts = pgTable(
  "crm_contacts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    displayName: text("display_name"),
    phone: text("phone"),
    email: text("email"),
    avatarUrl: text("avatar_url"),
    notes: text("notes"),
    tags: text("tags").array().notNull().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("crm_contacts_org_updated_idx").on(table.organizationId, table.updatedAt),
    index("crm_contacts_org_email_idx").on(table.organizationId, table.email),
    index("crm_contacts_org_phone_idx").on(table.organizationId, table.phone),
    uniqueIndex("crm_contacts_id_org_uq").on(table.id, table.organizationId),
  ],
);

/**
 * A verified identity on one customer channel. `channelConnectionId` is scoped
 * to an organization; `default` represents the organization's website widget.
 */
export const crmChannelIdentities = pgTable(
  "crm_channel_identities",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    contactId: text("contact_id").notNull(),
    channelType: text("channel_type", { enum: CRM_CHANNEL_TYPES }).notNull(),
    channelConnectionId: text("channel_connection_id").notNull().default("default"),
    externalUserId: text("external_user_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "crm_channel_identities_contact_org_fk",
      columns: [table.contactId, table.organizationId],
      foreignColumns: [crmContacts.id, crmContacts.organizationId],
    }).onDelete("cascade"),
    uniqueIndex("crm_channel_identity_external_uq").on(
      table.organizationId,
      table.channelType,
      table.channelConnectionId,
      table.externalUserId,
    ),
    index("crm_channel_identities_contact_idx").on(table.organizationId, table.contactId),
    uniqueIndex("crm_channel_identities_id_org_uq").on(table.id, table.organizationId),
  ],
);

/** Links legacy and future conversations to a CRM contact without guessing historic identities. */
export const crmConversationContacts = pgTable(
  "crm_conversation_contacts",
  {
    conversationId: text("conversation_id").notNull(),
    organizationId: text("organization_id").notNull(),
    contactId: text("contact_id").notNull(),
    linkedAt: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
    linkedByUserId: text("linked_by_user_id").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [
    foreignKey({
      name: "crm_conversation_contacts_conversation_org_fk",
      columns: [table.conversationId, table.organizationId],
      foreignColumns: [conversations.id, conversations.organizationId],
    }).onDelete("cascade"),
    foreignKey({
      name: "crm_conversation_contacts_contact_org_fk",
      columns: [table.contactId, table.organizationId],
      foreignColumns: [crmContacts.id, crmContacts.organizationId],
    }).onDelete("cascade"),
    uniqueIndex("crm_conversation_contacts_conversation_org_uq").on(
      table.conversationId,
      table.organizationId,
    ),
    index("crm_conversation_contacts_contact_idx").on(table.organizationId, table.contactId),
  ],
);

/** A sales need is explicit: no lead is auto-created from an inbound message. */
export const crmLeads = pgTable(
  "crm_leads",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    contactId: text("contact_id").notNull(),
    sourceChannel: text("source_channel", { enum: CRM_CHANNEL_TYPES }),
    status: text("status", { enum: CRM_LEAD_STATUSES }).notNull().default("new"),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "crm_leads_contact_org_fk",
      columns: [table.contactId, table.organizationId],
      foreignColumns: [crmContacts.id, crmContacts.organizationId],
    }).onDelete("cascade"),
    index("crm_leads_org_status_updated_idx").on(table.organizationId, table.status, table.updatedAt),
    index("crm_leads_org_contact_idx").on(table.organizationId, table.contactId),
    index("crm_leads_org_owner_idx").on(table.organizationId, table.ownerUserId),
    uniqueIndex("crm_leads_id_org_uq").on(table.id, table.organizationId),
  ],
);

export type CrmContact = typeof crmContacts.$inferSelect;
export type NewCrmContact = typeof crmContacts.$inferInsert;
export type CrmChannelIdentity = typeof crmChannelIdentities.$inferSelect;
export type NewCrmChannelIdentity = typeof crmChannelIdentities.$inferInsert;
export type CrmLead = typeof crmLeads.$inferSelect;
export type NewCrmLead = typeof crmLeads.$inferInsert;
