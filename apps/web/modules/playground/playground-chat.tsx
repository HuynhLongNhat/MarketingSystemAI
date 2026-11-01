"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, SendHorizontal } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";

import { PLAYGROUND_MAX_MESSAGE_LENGTH } from "@/lib/playground-api";

import { PlaygroundMessage } from "./playground-message";
import type { PlaygroundChatMessage } from "./use-playground-chat";

interface PlaygroundChatProps {
  messages: PlaygroundChatMessage[];
  sending: boolean;
  blockedReason: string | null;
  onSend: (content: string) => Promise<boolean>;
  onRetry: (errorId: string) => void;
}

export function PlaygroundChat({
  messages,
  sending,
  blockedReason,
  onSend,
  onRetry,
}: PlaygroundChatProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const canSend =
    !blockedReason &&
    !sending &&
    draft.trim().length > 0 &&
    draft.length <= PLAYGROUND_MAX_MESSAGE_LENGTH;

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    element.scrollTo({
      top: element.scrollHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages, sending]);

  function submit() {
    if (!canSend) return;

    const text = draft;
    setDraft("");
    void onSend(text);
  }

  return (
    <Card className="flex h-[calc(100dvh-13rem)] min-h-[480px] min-w-0 flex-col gap-0 overflow-hidden py-0">
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Nội dung cuộc thử nghiệm"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"
      >
        {messages.length === 0 && !sending ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full border">
              <Bot className="size-6" />
            </div>

            <div className="space-y-1">
              <p className="font-medium">Bắt đầu cuộc thử nghiệm</p>

              <p className="max-w-sm text-sm text-muted-foreground">
                Nhập một câu hỏi như khách hàng thật. Cuộc thử
                không được lưu vào hộp thư hội thoại.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <PlaygroundMessage
              key={message.id}
              message={message}
              disabled={sending}
              onRetry={onRetry}
            />
          ))
        )}

        {sending && (
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background">
              <Bot className="size-4" />
            </div>

            <div className="flex items-center gap-2 rounded-2xl border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Đang soạn câu trả lời...
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-3 sm:p-4">
        <div className="flex items-end gap-2">
          <Textarea
            aria-label="Nhập tin nhắn thử nghiệm"
            rows={2}
            maxLength={PLAYGROUND_MAX_MESSAGE_LENGTH}
            disabled={Boolean(blockedReason)}
            placeholder={
              blockedReason ??
              "Nhập tin nhắn... (Enter để gửi, Shift+Enter để xuống dòng)"
            }
            value={draft}
            className="max-h-40 min-h-[44px] resize-none"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit();
              }
            }}
          />

          <Button
            type="button"
            size="icon"
            aria-label="Gửi tin nhắn"
            disabled={!canSend}
            className="shrink-0 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            onClick={submit}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizontal className="size-4" />
            )}
          </Button>
        </div>

        <p className="mt-2 text-right text-[11px] text-muted-foreground">
          {draft.length}/{PLAYGROUND_MAX_MESSAGE_LENGTH}
        </p>
      </div>
    </Card>
  );
}