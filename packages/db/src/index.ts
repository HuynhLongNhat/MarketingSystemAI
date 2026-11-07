
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

export {
  knowledgeEntries,
  knowledgeDocuments,
  knowledgeChunks,
  KNOWLEDGE_DOCUMENT_STATUSES,
} from "./knowledge-schema.js";

export type {
  KnowledgeEntry,
  NewKnowledgeEntry,
  KnowledgeDocument,
  NewKnowledgeDocument,
  KnowledgeDocumentStatus,
  KnowledgeChunk,
  NewKnowledgeChunk,
} from "./knowledge-schema.js";

export {
  knowledgeEmbeddings,
  KNOWLEDGE_EMBEDDING_DIMENSIONS,
} from "./knowledge-vector-schema.js";

export type {
  KnowledgeEmbedding,
  NewKnowledgeEmbedding,
} from "./knowledge-vector-schema.js";

export {
  verifyDatabaseEnvironment,
} from "./environment-guard.js";

export type {
  DatabaseEnvironment,
} from "./environment-guard.js";

export {
  aiProviderConnections,
  aiModelDefaults,
  aiUsageLogs,
  aiUsageQuotas,
  aiUsageReservations,
  AI_PROVIDER_TYPES,
  AI_USAGE_STATUSES,
} from "./ai-schema.js";

export type {
  AiProviderType,
  AiProviderConnection,
  NewAiProviderConnection,
  AiModelDefault,
  NewAiModelDefault,
  AiUsageLog,
  NewAiUsageLog,
  AiUsageQuota,
  NewAiUsageQuota,
  AiUsageReservation,
  NewAiUsageReservation,
  AiUsageStatus,
} from "./ai-schema.js";

export {
  departments,
  agentTemplates,
  aiAgents,
  AGENT_STATUSES,
  AGENT_CATEGORIES,
} from "./agents-schema.js";

export type {
  AgentStatus,
  AgentCategory,
  AgentToolConfig,
  Department,
  NewDepartment,
  AgentTemplate,
  NewAgentTemplate,
  AiAgent,
  NewAiAgent,
} from "./agents-schema.js";

export {
  customerSupportAssignments,
} from "./support-assignment-schema.js";

export type {
  CustomerSupportAssignment,
  NewCustomerSupportAssignment,
} from "./support-assignment-schema.js";

export {
  officeDeskAssignments,
} from "./office-schema.js";

export type {
  OfficeDeskAssignment,
  NewOfficeDeskAssignment,
} from "./office-schema.js";

export {
  notifications,
  NOTIFICATION_TYPES,
} from "./notifications-schema.js";

export type {
  NotificationType,
  Notification,
  NewNotification,
} from "./notifications-schema.js";

export {
  knowledgeConnections,
  knowledgeExternalSources,
  KNOWLEDGE_CONNECTOR_TYPES,
  KNOWLEDGE_CONNECTION_STATUSES,
  KNOWLEDGE_SOURCE_STATUSES,
} from "./knowledge-connectors-schema.js";

export type {
  KnowledgeConnection,
  NewKnowledgeConnection,
  KnowledgeExternalSource,
  NewKnowledgeExternalSource,
} from "./knowledge-connectors-schema.js";
