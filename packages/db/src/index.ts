
export { db, pool } from "./client.js";

export {
  widgetSettings,
  user,
  session,
  account,
  verification,
  organization,
  member,
  invitation,
  contactSessions,
  conversations,
  conversationMessages,
  CONVERSATION_STATUSES,
  MESSAGE_ROLES,
} from "./schema.js";

export { eq, sql } from "drizzle-orm";

export type {
  DefaultSuggestions,
  WidgetSettings,
  NewWidgetSettings,
  User,
  NewUser,
  Session,
  NewSession,
  Account,
  NewAccount,
  Verification,
  NewVerification,
  Organization,
  NewOrganization,
  Member,
  NewMember,
  Invitation,
  NewInvitation,
  ContactSessionMetadata,
  ContactSession,
  NewContactSession,
  ConversationStatus,
  Conversation,
  NewConversation,
  MessageRole,
  ConversationMessage,
  NewConversationMessage,
} from "./schema.js";

export { verifyDatabaseEnvironment } from "./environment-guard.js";

export type {
  DatabaseEnvironment,
} from "./environment-guard.js";
