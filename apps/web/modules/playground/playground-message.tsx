"use client";

import { AlertTriangle, Bot, RotateCcw, User } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import type { PlaygroundChatMessage } from "./use-playground-chat";

interface PlaygroundMessageProps {
  message: PlaygroundChatMessage;
  disabled?: boolean;
  onRetry: (errorId: string) => void;
}

export function PlaygroundMessage({
  message,
  disabled,
  onRetry,
}: PlaygroundMessageProps) {
  if (message.kind === "error") {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-lg border border-dashed p-3 text-sm"
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

        <div className="min-w-0 flex-1 space-y-2">
          <p className="break-words">{message.content}</p>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onRetry(message.id)}
          >
            <RotateCcw className="size-3.5" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        isUser && "flex-row-reverse",
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background">
        {isUser ? (
          <User className="size-4" />
        ) : (
          <Bot className="size-4" />
        )}
      </div>

      <div
        className={cn(
          "flex min-w-0 max-w-[85%] flex-col gap-1",
          isUser && "items-end",
        )}
      >
        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-zinc-950 text-white dark:bg-white dark:text-black"
              : "border bg-muted/40",
          )}
        >
          {message.content}
        </div>

        {message.meta && (
          <p className="break-all px-1 text-[11px] text-muted-foreground">
            {message.meta.modelId}
            {" · "}
            {(message.meta.latencyMs / 1000).toFixed(1)}s
            {" · "}
            {message.meta.knowledgeMatched} FAQ
          </p>
        )}
      </div>
    </div>
  );
}