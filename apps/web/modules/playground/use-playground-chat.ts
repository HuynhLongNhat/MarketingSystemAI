"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api-client";
import {
  PLAYGROUND_MAX_MESSAGE_LENGTH,
  playgroundApi,
  type PlaygroundChatMeta,
  type PlaygroundRole,
} from "@/lib/playground-api";

export type PlaygroundChatMessage =
  | {
      id: string;
      kind: "message";
      role: PlaygroundRole;
      content: string;
      meta?: PlaygroundChatMeta;
    }
  | {
      id: string;
      kind: "error";
      content: string;
    };

const HISTORY_LIMIT = 12;

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return "Yêu cầu trước đang xử lý, bạn gửi quá nhanh hoặc tổ chức đã hết lượt thử trong 24 giờ. Vui lòng thử lại sau.";
    }

    if (error.status === 403) {
      return "Bạn không có quyền sử dụng Playground.";
    }

    if (error.status === 401) {
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    }

    if (error.status === 400) {
      return "Tin nhắn không hợp lệ hoặc quá dài.";
    }
  }

  return "Không thể kết nối tới máy chủ. Vui lòng thử lại.";
}

export function usePlaygroundChat() {
  const [messages, setMessages] = useState<PlaygroundChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(
    null,
  );

  const messagesRef = useRef<PlaygroundChatMessage[]>([]);
  const sendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const counterRef = useRef(0);

  const commit = useCallback((next: PlaygroundChatMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const nextId = useCallback(() => {
    counterRef.current += 1;
    return `pg-${Date.now()}-${counterRef.current}`;
  }, []);

  const send = useCallback(
    async (raw: string): Promise<boolean> => {
      const content = raw.trim();

      if (
        !content ||
        content.length > PLAYGROUND_MAX_MESSAGE_LENGTH ||
        sendingRef.current
      ) {
        return false;
      }

      sendingRef.current = true;
      setSending(true);

      const withUser: PlaygroundChatMessage[] = [
        ...messagesRef.current,
        { id: nextId(), kind: "message", role: "user", content },
      ];

      commit(withUser);

      const history = withUser
        .flatMap((item) =>
          item.kind === "message"
            ? [{ role: item.role, content: item.content }]
            : [],
        )
        .slice(-HISTORY_LIMIT);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await playgroundApi.chat(
          history,
          controller.signal,
        );

        if (controller.signal.aborted) {
          return false;
        }

        if (response.ok) {
          commit([
            ...messagesRef.current,
            {
              id: nextId(),
              kind: "message",
              role: "assistant",
              content: response.reply,
              meta: response.meta,
            },
          ]);
          setLastLatencyMs(response.meta.latencyMs);
        } else {
          commit([
            ...messagesRef.current,
            {
              id: nextId(),
              kind: "error",
              content: response.error.message,
            },
          ]);
        }

        return true;
      } catch (error) {
        if (controller.signal.aborted) {
          return false;
        }

        commit([
          ...messagesRef.current,
          {
            id: nextId(),
            kind: "error",
            content: describeError(error),
          },
        ]);

        return true;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          sendingRef.current = false;
          setSending(false);
        }
      }
    },
    [commit, nextId],
  );

  const retry = useCallback(
    (errorId: string) => {
      const current = messagesRef.current;
      const index = current.findIndex((item) => item.id === errorId);
      const previous = index > 0 ? current[index - 1] : undefined;

      if (
        index < 1 ||
        !previous ||
        previous.kind !== "message" ||
        previous.role !== "user"
      ) {
        return;
      }

      const content = previous.content;

      commit(current.filter((_, i) => i !== index && i !== index - 1));
      void send(content);
    },
    [commit, send],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    sendingRef.current = false;
    setSending(false);
    setLastLatencyMs(null);
    commit([]);
  }, [commit]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { messages, sending, lastLatencyMs, send, retry, reset };
}