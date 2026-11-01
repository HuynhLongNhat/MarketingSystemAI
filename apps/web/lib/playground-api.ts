import { apiFetch } from "./api-client";

export type PlaygroundRole = "user" | "assistant";

export type PlaygroundModelSource = "agent" | "default" | "legacy";

export type PlaygroundIssue =
  | "multiple_active_agents"
  | "no_active_agent"
  | "model_not_configured";

export interface PlaygroundOverview {
  ready: boolean;
  agent: { id: string; name: string } | null;
  model: {
    source: PlaygroundModelSource;
    provider: string | null;
    connectionName: string | null;
    modelId: string;
  } | null;
  knowledgeCount: number;
  issues: PlaygroundIssue[];
}

export type PlaygroundErrorCode =
  | "no_user_message"
  | "agent_ambiguous"
  | "not_configured"
  | "provider_error"
  | "timeout"
  | "empty_response";

export interface PlaygroundChatMeta {
  agentName: string | null;
  provider: string | null;
  modelId: string;
  source: PlaygroundModelSource;
  knowledgeMatched: number;
  latencyMs: number;
}

export type PlaygroundChatResponse =
  | { ok: true; reply: string; meta: PlaygroundChatMeta }
  | {
      ok: false;
      error: { code: PlaygroundErrorCode; message: string };
    };

export const PLAYGROUND_MAX_MESSAGE_LENGTH = 4000;

export const playgroundApi = {
  getOverview(signal?: AbortSignal) {
    return apiFetch<PlaygroundOverview>("/playground/overview", {
      signal,
    });
  },

  chat(
    messages: Array<{ role: PlaygroundRole; content: string }>,
    signal?: AbortSignal,
  ) {
    return apiFetch<PlaygroundChatResponse>("/playground/chat", {
      method: "POST",
      body: JSON.stringify({ messages }),
      signal,
    });
  },
};