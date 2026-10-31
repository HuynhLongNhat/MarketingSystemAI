
"use client";

import { useEffect, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  ArrowLeftIcon,
  LoaderIcon,
  MessageSquareIcon,
  PlusIcon,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";

import {
  conversationIdAtom,
  organizationIdAtom,
  screenAtom,
} from "../../atoms/widget-atoms";

import {
  widgetApi,
  widgetSession,
  widgetConversationStorage,
  type WidgetConversation,
} from "@/lib/widget-api";

type ConversationItem = WidgetConversation & {
  title: string;
};

export const WidgetInboxScreen = () => {
  const organizationId = useAtomValue(organizationIdAtom);

  const setScreen = useSetAtom(screenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const [conversations, setConversations] =
    useState<ConversationItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    const token = widgetSession.get(organizationId);

    if (!token) {
      setScreen("auth");
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);

        const items =
          await widgetApi.listConversations(token);

        const enriched = await Promise.all(
          items.map(async (conversation) => {
            let title = "Cuộc trò chuyện mới";

            try {
              const page = await widgetApi.listMessages(
                token,
                conversation.id,
              );

              const firstUserMessage = page.items.find(
                (message) => message.role === "user",
              );

              if (firstUserMessage) {
                title = firstUserMessage.content;
              }
            } catch {
              // Giữ tiêu đề mặc định khi không tải được tin nhắn.
            }

            return {
              ...conversation,
              title,
            };
          }),
        );

        if (cancelled) return;

        setConversations(enriched);
        setError(null);
      } catch (err) {
        if (cancelled) return;

        console.error("Load conversations failed", err);
        setError("Không thể tải lịch sử trò chuyện");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [organizationId, setScreen]);

  const openConversation = (conversationId: string) => {
    if (!organizationId) return;

    widgetConversationStorage.set(
      organizationId,
      conversationId,
    );

    setConversationId(conversationId);
    setScreen("chat");
  };

  const statusLabel = (status: WidgetConversation["status"]) => {
    switch (status) {
      case "resolved":
        return "Đã giải quyết";
      case "escalated":
        return "Đang chuyển nhân viên";
      default:
        return "Đang hỗ trợ";
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center justify-between border-b px-3 py-3">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setScreen("selection")}
            aria-label="Quay lại"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>

          <h1 className="font-semibold">
            Lịch sử trò chuyện
          </h1>
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => setScreen("selection")}
          aria-label="Cuộc trò chuyện mới"
        >
          <PlusIcon className="size-5" />
        </Button>
      </header>

      <main className="flex-1 space-y-1 overflow-y-auto p-3">
        {isLoading && (
          <div className="flex justify-center py-10">
            <LoaderIcon className="size-5 animate-spin" />
          </div>
        )}

        {error && (
          <p className="p-4 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        {!isLoading &&
          !error &&
          conversations.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <MessageSquareIcon className="size-8 text-muted-foreground" />

              <p className="text-sm text-muted-foreground">
                Bạn chưa có cuộc trò chuyện nào.
              </p>

              <Button
                onClick={() => setScreen("selection")}
              >
                Bắt đầu trò chuyện
              </Button>
            </div>
          )}

        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => openConversation(conversation.id)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted"
          >
            <MessageSquareIcon className="size-4 shrink-0 text-muted-foreground" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {conversation.title}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {statusLabel(conversation.status)}
                {" · "}
                {new Date(
                  conversation.createdAt,
                ).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </button>
        ))}
      </main>
    </div>
  );
};
