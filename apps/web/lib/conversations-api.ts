
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
  name: string | null;
  email: string | null;
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
  assignedToUserId: string | null;
  assignedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithContact extends Conversation {
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
  list() {
    return apiFetch<Conversation[]>("/conversations");
  },

  get(id: string) {
    return apiFetch<Conversation>(
      `/conversations/${encodeURIComponent(id)}`,
    );
  },

  listPage(options: ListConversationsOptions = {}) {
    const params = new URLSearchParams();

    if (options.status) {
      params.set("status", options.status);
    }

    if (options.cursor) {
      params.set("cursor", options.cursor);
    }

    params.set("limit", String(options.limit ?? 20));

    return apiFetch<ConversationPage>(
      `/conversations/page?${params.toString()}`,
    );
  },

  updateStatus(id: string, status: ConversationStatus) {
    return apiFetch<Conversation>(
      `/conversations/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    );
  },

  listContactSessions() {
    return apiFetch<ContactSession[]>("/contact-sessions");
  },

  getContactSessionByConversation(id: string) {
    return apiFetch<ContactSession>(
      `/conversations/${encodeURIComponent(id)}/contact-session`,
    );
  },
};
