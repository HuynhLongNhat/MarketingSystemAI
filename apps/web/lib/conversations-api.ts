
import { apiFetch } from "./api-client";

// ==========================================
// TYPES
// ==========================================

export type ConversationStatus =
  | "unresolved"
  | "escalated"
  | "resolved";

export interface ContactSession {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  expiresAt: string;

  metadata: {
    userAgent?: string;
    language?: string;
    languages?: string;
    platform?: string;
    vendor?: string;
    timezone?: string;
    timezoneOffset?: number;
    screenResolution?: string;
    viewportSize?: string;
    cookieEnabled?: boolean;
    referrer?: string;
    currentUrl?: string;
  } | null;

  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  contactSessionId: string;
  threadId: string | null;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithContact
  extends Conversation {
  contactSession: Pick<
    ContactSession,
    "id" | "name" | "email" | "metadata" | "createdAt"
  >;
}

export interface ConversationPage {
  items: ConversationWithContact[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ListConversationsOptions {
  status?: ConversationStatus;
  cursor?: string;
  limit?: number;
}

// ==========================================
// API CLIENT
// ==========================================

export const conversationsApi = {
  // GET /v1/conversations
  list() {
    return apiFetch<Conversation[]>(
      "/conversations",
    );
  },

  // GET /v1/conversations/:id
  get(id: string) {
    return apiFetch<Conversation>(
      `/conversations/${encodeURIComponent(id)}`,
    );
  },

  // GET /v1/conversations/page
  listPage(
    options: ListConversationsOptions = {},
  ) {
    const params = new URLSearchParams();

    if (options.status) {
      params.set("status", options.status);
    }

    if (options.cursor) {
      params.set("cursor", options.cursor);
    }

    params.set(
      "limit",
      String(options.limit ?? 20),
    );

    return apiFetch<ConversationPage>(
      `/conversations/page?${params.toString()}`,
    );
  },

  // PATCH /v1/conversations/:id/status
  updateStatus(
    id: string,
    status: ConversationStatus,
  ) {
    return apiFetch<Conversation>(
      `/conversations/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    );
  },

  // GET /v1/contact-sessions
  listContactSessions() {
    return apiFetch<ContactSession[]>(
      "/contact-sessions",
    );
  },

  // GET /v1/conversations/:id/contact-session
  getContactSessionByConversation(
    id: string,
  ) {
    return apiFetch<ContactSession>(
      `/conversations/${encodeURIComponent(id)}/contact-session`,
    );
  },
};
