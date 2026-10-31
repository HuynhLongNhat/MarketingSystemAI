
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

export type PublicWidgetSettings = {
  organizationId: string;
  greetMessage: string;
  defaultSuggestions: Record<string, string>;
  vapiSettings: {
    assistantId?: string;
    phoneNumber?: string;
  };
};

export type PublicWidgetConfiguration = {
  organization: {
    id: string;
    name: string;
  };
  settings: PublicWidgetSettings;
};

export type WidgetSessionInfo = {
  valid: boolean;
  contactSessionId: string;
  organizationId: string;
  visitorType: "guest" | "identified";
  expiresAt: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type WidgetConversation = {
  id: string;
  organizationId: string;
  contactSessionId: string;
  status: "unresolved" | "escalated" | "resolved";
  createdAt: string;
};

export type WidgetMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  clientMessageId?: string | null;
  createdAt: string;
};

type MessagePage = {
  items: WidgetMessage[];
  hasMore: boolean;
  nextBefore: string | null;
};

export class WidgetApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "WidgetApiError";
  }
}

const tokenKey = (organizationId: string) =>
  `widget_session_token_${organizationId}`;

const activeConversationKey = (organizationId: string) =>
  `widget_active_conversation_${organizationId}`;

export const widgetSession = {
  get(organizationId: string): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(tokenKey(organizationId));
  },

  set(organizationId: string, token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(tokenKey(organizationId), token);
  },

  clear(organizationId: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(tokenKey(organizationId));
    localStorage.removeItem(activeConversationKey(organizationId));
  },
};

export const widgetConversationStorage = {
  get(organizationId: string): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(
      activeConversationKey(organizationId),
    );
  },

  set(organizationId: string, conversationId: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      activeConversationKey(organizationId),
      conversationId,
    );
  },

  clear(organizationId: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(
      activeConversationKey(organizationId),
    );
  },
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body) {
    headers.set(
      "Content-Type",
      "application/json; charset=utf-8",
    );
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(
    `${API_URL}/v1/public/widget${path}`,
    {
      ...options,
      headers,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new WidgetApiError(
      response.status,
      `Widget API error: ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export const widgetApi = {
  getPublicConfiguration(organizationId: string) {
    return request<PublicWidgetConfiguration>(
      `/organizations/${encodeURIComponent(organizationId)}`,
    );
  },

  createGuestSession(organizationId: string) {
    return request<{
      contactSessionId: string;
      token: string;
      expiresAt: string;
      visitorType: "guest";
    }>("/guest-sessions", {
      method: "POST",
      body: JSON.stringify({ organizationId }),
    });
  },

  // Giữ API cũ để tương thích.
  createSession(input: {
    organizationId: string;
    name: string;
    email: string;
  }) {
    return request<{
      contactSessionId: string;
      token: string;
      expiresAt: string;
      visitorType: "identified";
    }>("/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  validateSession(token: string) {
    return request<WidgetSessionInfo>(
      "/sessions/current",
      {},
      token,
    );
  },

  createConversation(token: string) {
    return request<WidgetConversation>(
      "/conversations",
      { method: "POST" },
      token,
    );
  },

  listConversations(token: string) {
    return request<WidgetConversation[]>(
      "/conversations",
      {},
      token,
    );
  },

  getConversation(token: string, id: string) {
    return request<WidgetConversation>(
      `/conversations/${encodeURIComponent(id)}`,
      {},
      token,
    );
  },

  listMessages(
    token: string,
    id: string,
    before?: string,
  ) {
    const query = before
      ? `?before=${encodeURIComponent(before)}`
      : "";

    return request<MessagePage>(
      `/conversations/${encodeURIComponent(id)}/messages${query}`,
      {},
      token,
    );
  },

  sendMessage(
    token: string,
    id: string,
    content: string,
    clientMessageId: string,
  ) {
    return request<WidgetMessage>(
      `/conversations/${encodeURIComponent(id)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          content,
          clientMessageId,
        }),
      },
      token,
    );
  },
};
