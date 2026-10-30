
import { apiFetch } from "./api-client";

export type MessageRole =
  | "user"
  | "assistant"
  | "system"
  | "tool";

export interface ConversationMessage {
  id: string;
  organizationId: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  senderId: string | null;
  createdAt: string;
}

export interface MessagesPage {
  items: ConversationMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ListMessagesOptions {
  cursor?: string;
  limit?: number;
}

export interface EnhancedMessageResponse {
  text: string;
}

const conversationPath = (conversationId: string) =>
  `/conversations/${encodeURIComponent(conversationId)}/messages`;

export const messagesApi = {
  list(
    conversationId: string,
    options: ListMessagesOptions = {},
  ) {
    const params = new URLSearchParams();

    params.set("limit", String(options.limit ?? 20));

    if (options.cursor) {
      params.set("cursor", options.cursor);
    }

    return apiFetch<MessagesPage>(
      `${conversationPath(conversationId)}?${params.toString()}`,
    );
  },

  create(conversationId: string, content: string) {
    return apiFetch<ConversationMessage>(
      conversationPath(conversationId),
      {
        method: "POST",
        body: JSON.stringify({ content }),
      },
    );
  },

  enhance(conversationId: string, prompt: string) {
    return apiFetch<EnhancedMessageResponse>(
      `${conversationPath(conversationId)}/enhance`,
      {
        method: "POST",
        body: JSON.stringify({ prompt }),
      },
    );
  },
};
