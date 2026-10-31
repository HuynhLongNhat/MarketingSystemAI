
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeftIcon,
  HistoryIcon,
  PlusIcon,
} from "lucide-react";

import {
  AISuggestion,
  AISuggestions,
} from "@workspace/ui/components/ai/suggestion";
import { Button } from "@workspace/ui/components/button";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { Form, FormField } from "@workspace/ui/components/form";

import {
  AIConversation,
  AIConversationContent,
  AIConversationScrollButton,
} from "@workspace/ui/components/ai/conversation";

import {
  AIInput,
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
  conversationIdAtom,
  organizationIdAtom,
  screenAtom,
  widgetSettingsAtom,
} from "../../atoms/widget-atoms";

import {
  widgetApi,
  widgetSession,
  type WidgetConversation,
  type WidgetMessage,
} from "@/lib/widget-api";

const formSchema = z.object({
  message: z.string().trim().min(1, "Vui lòng nhập tin nhắn"),
});

type FormValues = z.infer<typeof formSchema>;

export const WidgetChatScreen = () => {
  const setScreen = useSetAtom(screenAtom);

  const conversationId = useAtomValue(conversationIdAtom);
  const organizationId = useAtomValue(organizationIdAtom);
  const settings = useAtomValue(widgetSettingsAtom);

  const [conversation, setConversation] =
    useState<WidgetConversation | null>(null);

  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: { message: "" },
  });

  const suggestions = useMemo(() => {
    if (!settings) return [];

    return Object.values(
      settings.defaultSuggestions ?? {},
    ).filter(
      (value): value is string =>
        typeof value === "string" && value.length > 0,
    );
  }, [settings]);

  const loadConversation = useCallback(async () => {
    if (!organizationId || !conversationId) {
      setIsLoading(false);
      return;
    }

    const token = widgetSession.get(organizationId);

    if (!token) {
      setScreen("auth");
      return;
    }

    setIsLoading(true);

    try {
      const [details, page] = await Promise.all([
        widgetApi.getConversation(token, conversationId),
        widgetApi.listMessages(token, conversationId),
      ]);

      setConversation(details);
      setMessages(page.items);
      setNextBefore(page.nextBefore);
      setHasMore(page.hasMore);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Không thể tải cuộc trò chuyện");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, conversationId, setScreen]);

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  const refreshMessages = useCallback(async () => {
    if (!organizationId || !conversationId) return;

    const token = widgetSession.get(organizationId);
    if (!token) return;

    try {
      const [details, page] = await Promise.all([
        widgetApi.getConversation(token, conversationId),
        widgetApi.listMessages(token, conversationId),
      ]);

      setConversation(details);

      setMessages((current) => {
        const map = new Map(
          current.map((message) => [message.id, message]),
        );

        for (const message of page.items) {
          map.set(message.id, message);
        }

        return Array.from(map.values()).sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime() ||
            a.id.localeCompare(b.id),
        );
      });
    } catch (err) {
      console.error("Message refresh failed", err);
    }
  }, [organizationId, conversationId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshMessages();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshMessages]);

  const loadMore = async () => {
    if (
      !organizationId ||
      !conversationId ||
      !nextBefore ||
      !hasMore ||
      isLoadingMore
    ) {
      return;
    }

    const token = widgetSession.get(organizationId);
    if (!token) return;

    setIsLoadingMore(true);

    try {
      const page = await widgetApi.listMessages(
        token,
        conversationId,
        nextBefore,
      );

      setMessages((current) => {
        const map = new Map(
          [...page.items, ...current].map(
            (message) => [message.id, message],
          ),
        );

        return Array.from(map.values()).sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime() ||
            a.id.localeCompare(b.id),
        );
      });

      setHasMore(page.hasMore);
      setNextBefore(page.nextBefore);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (
      !organizationId ||
      !conversationId ||
      conversation?.status === "resolved" ||
      isSending
    ) {
      return;
    }

    const token = widgetSession.get(organizationId);
    if (!token) return;

    setIsSending(true);

    try {
      const message = await widgetApi.sendMessage(
        token,
        conversationId,
        values.message.trim(),
      );

      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current;
        }

        return [...current, message];
      });

      form.reset({ message: "" });
      setError(null);

      await refreshMessages();
    } catch (err) {
      console.error(err);
      setError("Không thể gửi tin nhắn");
    } finally {
      setIsSending(false);
    }
  };

  const isResolved = conversation?.status === "resolved";

  return (
    <>
      <header className="flex items-center justify-between border-b bg-background px-3 py-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setScreen("inbox")}
            size="icon"
            variant="ghost"
            aria-label="Lịch sử trò chuyện"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>

          <div>
            <p className="text-sm font-semibold">
              Hỗ trợ khách hàng
            </p>

            <p className="text-xs text-muted-foreground">
              {isResolved
                ? "Đã kết thúc"
                : "Cuộc trò chuyện"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setScreen("inbox")}
            aria-label="Xem lịch sử"
          >
            <HistoryIcon className="size-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setScreen("selection")}
            aria-label="Cuộc trò chuyện mới"
          >
            <PlusIcon className="size-5" />
          </Button>
        </div>
      </header>

      <AIConversation>
        <AIConversationContent>
          {isLoading && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Đang tải cuộc trò chuyện...
            </p>
          )}

          {error && (
            <p className="p-2 text-center text-sm text-destructive">
              {error}
            </p>
          )}

          {hasMore && (
            <div className="flex justify-center py-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isLoadingMore}
                onClick={() => void loadMore()}
              >
                {isLoadingMore
                  ? "Đang tải..."
                  : "Xem tin nhắn cũ hơn"}
              </Button>
            </div>
          )}

          {messages.map((message) => (
            <AIMessage
              from={
                message.role === "user"
                  ? "user"
                  : "assistant"
              }
              key={message.id}
            >
              <AIMessageContent>
                <AIResponse>{message.content}</AIResponse>
              </AIMessageContent>

              {message.role === "assistant" && (
                <DicebearAvatar
                  imageUrl="/logo.svg"
                  seed="assistant"
                  size={32}
                />
              )}
            </AIMessage>
          ))}
        </AIConversationContent>

        <AIConversationScrollButton />
      </AIConversation>

      {messages.length === 1 && suggestions.length > 0 && (
        <AISuggestions className="flex w-full flex-col items-end p-2">
          {suggestions.map((suggestion) => (
            <AISuggestion
              key={suggestion}
              suggestion={suggestion}
              onClick={() => {
                form.setValue("message", suggestion, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                });

                void form.handleSubmit(onSubmit)();
              }}
            />
          ))}
        </AISuggestions>
      )}

      <Form {...form}>
        <AIInput
          className="rounded-none border-x-0 border-b-0 bg-background"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <AIInputTextarea
                disabled={
                  isResolved || isSending || isLoading
                }
                onChange={field.onChange}
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
                    ? "Cuộc trò chuyện đã kết thúc"
                    : "Nhập tin nhắn..."
                }
                value={field.value}
              />
            )}
          />

          <AIInputToolbar>
            <AIInputTools />

            <AIInputSubmit
              disabled={
                isResolved ||
                isLoading ||
                isSending ||
                !form.formState.isValid
              }
              status="ready"
              type="submit"
            />
          </AIInputToolbar>
        </AIInput>
      </Form>
    </>
  );
};
