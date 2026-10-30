"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { MoreHorizontalIcon, Wand2Icon } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Form, FormField } from "@workspace/ui/components/form";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import {
  AIConversation,
  AIConversationContent,
  AIConversationScrollButton,
} from "@workspace/ui/components/ai/conversation";

import {
  AIInput,
  AIInputButton,
  AIInputSubmit,
  AIInputTextarea,
  AIInputToolbar,
  AIInputTools,
} from "@workspace/ui/components/ai/input";

import {
  AIMessage,
  AIMessageContent,
} from "@workspace/ui/components/ai/message";

import { AIResponse } from "@workspace/ui/components/ai/response";

import {
  conversationsApi,
  type Conversation,
  type ConversationStatus,
} from "@/lib/conversations-api";

import { messagesApi, type ConversationMessage } from "@/lib/messages-api";

import { ConversationStatusButton } from "../components/conversation-status-button";

const PAGE_SIZE = 20;
const POLLING_INTERVAL = 5000;

const formSchema = z.object({
  message: z.string().trim().min(1, "Message is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface ConversationIdViewProps {
  conversationId: string;
}

function sortMessages(messages: ConversationMessage[]) {
  return [...messages].sort((a, b) => {
    const dateComparison =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return a.id.localeCompare(b.id);
  });
}

function mergeMessages(
  current: ConversationMessage[],
  incoming: ConversationMessage[],
) {
  const byId = new Map<string, ConversationMessage>();

  for (const message of current) {
    byId.set(message.id, message);
  }

  for (const message of incoming) {
    byId.set(message.id, message);
  }

  return sortMessages(Array.from(byId.values()));
}

export const ConversationIdView = ({
  conversationId,
}: ConversationIdViewProps) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);

  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [isSending, setIsSending] = useState(false);

  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhanceResponse = async () => {
    if (
      !conversation ||
      conversation.status === "resolved" ||
      isEnhancing ||
      isSending
    ) {
      return;
    }

    const currentValue = form.getValues("message").trim();

    if (!currentValue) {
      return;
    }

    setIsEnhancing(true);

    try {
      const result = await messagesApi.enhance(conversationId, currentValue);

      form.setValue("message", result.text, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      });

      toast.success("Message enhanced");
    } catch (error) {
      console.error("Failed to enhance message:", error);
      toast.error("Failed to enhance message");
    } finally {
      setIsEnhancing(false);
    }
  };

  const requestGeneration = useRef(0);
  const loadingMoreRef = useRef(false);
  const sendingRef = useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      message: "",
    },
  });

  const loadInitialData = useCallback(async () => {
    const generation = ++requestGeneration.current;

    setIsLoading(true);
    setLoadError(null);
    setConversation(null);
    setMessages([]);
    setNextCursor(null);
    setHasMore(false);

    try {
      const [conversationResult, messagesResult] = await Promise.all([
        conversationsApi.get(conversationId),
        messagesApi.list(conversationId, {
          limit: PAGE_SIZE,
        }),
      ]);

      if (generation !== requestGeneration.current) {
        return;
      }

      setConversation(conversationResult);
      setMessages(sortMessages(messagesResult.items));
      setNextCursor(messagesResult.nextCursor);
      setHasMore(messagesResult.hasMore);
    } catch (error) {
      if (generation !== requestGeneration.current) {
        return;
      }

      console.error("Failed to load conversation:", error);
      setLoadError("Failed to load conversation");
      toast.error("Failed to load conversation");
    } finally {
      if (generation === requestGeneration.current) {
        setIsLoading(false);
      }
    }
  }, [conversationId]);

  useEffect(() => {
    void loadInitialData();

    return () => {
      requestGeneration.current += 1;
    };
  }, [loadInitialData]);

  const refreshLatest = useCallback(async () => {
    const generation = requestGeneration.current;

    try {
      const [latestConversation, latestMessages] = await Promise.all([
        conversationsApi.get(conversationId),
        messagesApi.list(conversationId, {
          limit: PAGE_SIZE,
        }),
      ]);

      if (generation !== requestGeneration.current) {
        return;
      }

      setConversation(latestConversation);

      setMessages((current) => mergeMessages(current, latestMessages.items));
    } catch (error) {
      console.error("Failed to refresh messages:", error);
    }
  }, [conversationId]);

  useEffect(() => {
    if (isLoading || loadError) {
      return;
    }

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshLatest();
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [isLoading, loadError, refreshLatest]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMoreRef.current) {
      return;
    }

    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    const generation = requestGeneration.current;

    try {
      const page = await messagesApi.list(conversationId, {
        cursor: nextCursor,
        limit: PAGE_SIZE,
      });

      if (generation !== requestGeneration.current) {
        return;
      }

      setMessages((current) => mergeMessages(current, page.items));

      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (error) {
      console.error("Failed to load older messages:", error);
      toast.error("Failed to load older messages");
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [conversationId, hasMore, nextCursor]);

  const handleToggleStatus = async () => {
    if (!conversation || isUpdatingStatus) {
      return;
    }

    const nextStatus: ConversationStatus =
      conversation.status === "unresolved"
        ? "escalated"
        : conversation.status === "escalated"
          ? "resolved"
          : "unresolved";

    setIsUpdatingStatus(true);

    try {
      const updated = await conversationsApi.updateStatus(
        conversationId,
        nextStatus,
      );

      setConversation(updated);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update conversation status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (
      !conversation ||
      conversation.status === "resolved" ||
      sendingRef.current
    ) {
      return;
    }

    const content = values.message.trim();

    if (!content) {
      return;
    }

    sendingRef.current = true;
    setIsSending(true);

    try {
      const created = await messagesApi.create(conversationId, content);

      setMessages((current) => mergeMessages(current, [created]));

      form.reset({ message: "" });

      await refreshLatest();
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  if (isLoading) {
    return <ConversationIdViewLoading />;
  }

  if (loadError || !conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          {loadError ?? "Conversation not found"}
        </p>
        <Button onClick={() => void loadInitialData()}>Retry</Button>
      </div>
    );
  }

  const isResolved = conversation.status === "resolved";

  return (
    <div className="flex h-full flex-col bg-muted">
      <header className="flex items-center justify-between border-b bg-background p-2.5">
        <Button size="sm" variant="ghost">
          <MoreHorizontalIcon />
        </Button>

        <ConversationStatusButton
          onClick={handleToggleStatus}
          status={conversation.status}
          disabled={isUpdatingStatus}
        />
      </header>

      <AIConversation className="max-h-[calc(100vh-180px)]">
        <AIConversationContent>
          {hasMore && (
            <div className="flex justify-center py-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isLoadingMore}
                onClick={() => void handleLoadMore()}
              >
                {isLoadingMore ? "Loading..." : "Load older messages"}
              </Button>
            </div>
          )}

          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages yet
            </p>
          )}

          {messages.map((message) => (
            <AIMessage
              key={message.id}
              from={message.role === "user" ? "assistant" : "user"}
            >
              <AIMessageContent>
                <AIResponse>{message.content}</AIResponse>
              </AIMessageContent>

              {message.role === "user" && (
                <DicebearAvatar
                  seed={conversation.contactSessionId}
                  size={32}
                />
              )}
            </AIMessage>
          ))}
        </AIConversationContent>

        <AIConversationScrollButton />
      </AIConversation>

      <div className="p-2">
        <Form {...form}>
          <AIInput onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <AIInputTextarea
                  disabled={isResolved || isSending}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();

                      void form.handleSubmit(onSubmit)();
                    }
                  }}
                  placeholder={
                    isResolved
                      ? "This conversation has been resolved"
                      : "Type your response as an operator..."
                  }
                  value={field.value}
                />
              )}
            />

            <AIInputToolbar>
              <AIInputTools>
                <AIInputButton
                  type="button"
                  onClick={() => void handleEnhanceResponse()}
                  disabled={
                    isResolved ||
                    isEnhancing ||
                    isSending ||
                    !form.formState.isValid
                  }
                >
                  <Wand2Icon />
                  {isEnhancing ? "Enhancing..." : "Enhance"}
                </AIInputButton>
              </AIInputTools>

              <AIInputSubmit
                disabled={isResolved || !form.formState.isValid || isSending}
                status="ready"
                type="submit"
              />
            </AIInputToolbar>
          </AIInput>
        </Form>
      </div>
    </div>
  );
};

export const ConversationIdViewLoading = () => {
  return (
    <div className="flex h-full flex-col bg-muted">
      <header className="flex items-center justify-between border-b bg-background p-2.5">
        <Button disabled size="sm" variant="ghost">
          <MoreHorizontalIcon />
        </Button>
      </header>

      <AIConversation className="max-h-[calc(100vh-180px)]">
        <AIConversationContent>
          {Array.from({ length: 8 }, (_, index) => {
            const isUser = index % 2 === 0;
            const widths = ["w-48", "w-60", "w-72"];
            const width = widths[index % widths.length];

            return (
              <div
                className={cn(
                  "group flex w-full items-end justify-end gap-2 py-2 [&>div]:max-w-[80%]",
                  isUser ? "is-user" : "is-assistant flex-row-reverse",
                )}
                key={index}
              >
                <Skeleton
                  className={`h-9 ${width} rounded-lg bg-neutral-200`}
                />
                <Skeleton className="size-8 rounded-full bg-neutral-200" />
              </div>
            );
          })}
        </AIConversationContent>
      </AIConversation>

      <div className="p-2">
        <AIInput>
          <AIInputTextarea
            disabled
            placeholder="Type your response as an operator..."
          />

          <AIInputToolbar>
            <AIInputTools />
            <AIInputSubmit disabled status="ready" />
          </AIInputToolbar>
        </AIInput>
      </div>
    </div>
  );
};
