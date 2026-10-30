
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

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
  createdAt: string;
};

type MessagePage = {
  items: WidgetMessage[];
  hasMore: boolean;
  nextBefore: string | null;
};

const tokenKey = (organizationId: string) =>
  `widget_session_token_${organizationId}`;

export const widgetSession = {
  get(organizationId: string) {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(tokenKey(organizationId));
  },

  set(organizationId: string, token: string) {
    localStorage.setItem(tokenKey(organizationId), token);
  },

  clear(organizationId: string) {
    localStorage.removeItem(tokenKey(organizationId));
  },
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/v1/public/widget${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Widget API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const widgetApi = {
  createSession(input: {
    organizationId: string;
    name: string;
    email: string;
  }) {
    return request<{
      contactSessionId: string;
      token: string;
      expiresAt: string;
    }>("/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  validateSession(token: string) {
    return request<{
      valid: boolean;
      contactSessionId: string;
      organizationId: string;
    }>("/sessions/current", {}, token);
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

  sendMessage(token: string, id: string, content: string) {
    return request<WidgetMessage>(
      `/conversations/${encodeURIComponent(id)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ content }),
      },
      token,
    );
  },
};
