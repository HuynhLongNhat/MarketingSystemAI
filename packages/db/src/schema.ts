import {
  boolean,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// -----------------------------------------------------------------------------
// Existing widget settings — giữ nguyên để không phá dữ liệu hiện có.
// -----------------------------------------------------------------------------

export type DefaultSuggestions = {
  suggestion1?: string;
  suggestion2?: string;
  suggestion3?: string;
};

export const widgetSettings = pgTable("widget_settings", {
  organizationId: text("organization_id").primaryKey(),

  greetMessage: text("greet_message").notNull(),

  defaultSuggestions: jsonb("default_suggestions")
    .$type<DefaultSuggestions>()
    .notNull(),

  vapiAssistantId: text("vapi_assistant_id"),

  vapiPhoneNumber: text("vapi_phone_number"),
});

// -----------------------------------------------------------------------------
// Better Auth core tables.
// -----------------------------------------------------------------------------

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Added by Better Auth Organization plugin.
    activeOrganizationId: text("active_organization_id"),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// -----------------------------------------------------------------------------
// Better Auth Organization plugin tables.
// -----------------------------------------------------------------------------

export const organization = pgTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logo: text("logo"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("organization_slug_unique").on(table.slug)],
);

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("member_organization_id_idx").on(table.organizationId),
    index("member_user_id_idx").on(table.userId),
    uniqueIndex("member_organization_user_unique").on(
      table.organizationId,
      table.userId,
    ),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("invitation_organization_id_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
  ],
);

// -----------------------------------------------------------------------------
// Inferred TypeScript types.
// -----------------------------------------------------------------------------

export type WidgetSettings = typeof widgetSettings.$inferSelect;
export type NewWidgetSettings = typeof widgetSettings.$inferInsert;

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;

export type Member = typeof member.$inferSelect;
export type NewMember = typeof member.$inferInsert;

export type Invitation = typeof invitation.$inferSelect;
export type NewInvitation = typeof invitation.$inferInsert;

export type ContactSessionMetadata = {
  userAgent?: string;
  language?: string;
  languages?: string;
  platform?: string;
  vendor?: string;
  screenResolution?: string;
  viewportSize?: string;
  timezone?: string;
  timezoneOffset?: number;
  cookieEnabled?: boolean;
  referrer?: string;
  currentUrl?: string;
};

export const contactSessions = pgTable(
  "contact_sessions",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),
    email: text("email").notNull(),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),

    metadata: jsonb("metadata")
      .$type<ContactSessionMetadata>(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    }).notNull().defaultNow(),
  },
  (table) => [
    index("contact_sessions_org_idx")
      .on(table.organizationId),

    index("contact_sessions_expires_idx")
      .on(table.expiresAt),

    uniqueIndex("contact_sessions_id_org_unique")
      .on(table.id, table.organizationId),
  ],
);

//
// Conversations
//

export const CONVERSATION_STATUSES = [
  "unresolved",
  "escalated",
  "resolved",
] as const;

export type ConversationStatus =
  (typeof CONVERSATION_STATUSES)[number];

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, {
        onDelete: "cascade",
      }),

    contactSessionId: text("contact_session_id")
      .notNull(),

    // Nullable until the new AI runtime is integrated.
    threadId: text("thread_id").unique(),

    status: text("status", {
      enum: CONVERSATION_STATUSES,
    }).notNull().default("unresolved"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "conversations_session_org_fk",
      columns: [
        table.contactSessionId,
        table.organizationId,
      ],
      foreignColumns: [
        contactSessions.id,
        contactSessions.organizationId,
      ],
    }).onDelete("cascade"),

    index("conversations_org_status_idx")
      .on(table.organizationId, table.status),

    index("conversations_session_idx")
      .on(table.contactSessionId),

    index("conversations_org_created_idx")
      .on(table.organizationId, table.createdAt),
  ],
);

export type ContactSession =
  typeof contactSessions.$inferSelect;

export type NewContactSession =
  typeof contactSessions.$inferInsert;

export type Conversation =
  typeof conversations.$inferSelect;

export type NewConversation =
  typeof conversations.$inferInsert;