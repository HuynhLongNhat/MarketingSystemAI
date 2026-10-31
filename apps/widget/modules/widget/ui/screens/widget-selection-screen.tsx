
"use client";

import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  HistoryIcon,
  LoaderIcon,
  MessageSquarePlusIcon,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { WidgetFooter } from "../components/widget-footer";

import {
  conversationIdAtom,
  errorMessageAtom,
  organizationIdAtom,
  screenAtom,
} from "../../atoms/widget-atoms";

import {
  widgetApi,
  widgetSession,
  widgetConversationStorage,
} from "@/lib/widget-api";

export const WidgetSelectionScreen = () => {
  const organizationId = useAtomValue(organizationIdAtom);
  const setScreen = useSetAtom(screenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);
  const setErrorMessage = useSetAtom(errorMessageAtom);

  const [isPending, setIsPending] = useState(false);

  const handleNewConversation = async () => {
    if (!organizationId || isPending) return;

    const token = widgetSession.get(organizationId);

    if (!token) {
      setScreen("auth");
      return;
    }

    setIsPending(true);

    try {
      const conversation =
        await widgetApi.createConversation(token);

      widgetConversationStorage.set(
        organizationId,
        conversation.id,
      );

      setConversationId(conversation.id);
      setScreen("chat");
    } catch (error) {
      console.error("Create conversation failed", error);

      setErrorMessage("Không thể tạo cuộc trò chuyện");
      setScreen("error");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-base font-semibold">
          Hỗ trợ khách hàng
        </h1>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setScreen("inbox")}
          aria-label="Lịch sử trò chuyện"
        >
          <HistoryIcon className="size-5" />
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <MessageSquarePlusIcon className="size-7 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">
            Xin chào!
          </h2>

          <p className="text-sm text-muted-foreground">
            Chúng tôi có thể giúp gì cho bạn hôm nay?
          </p>
        </div>

        <Button
          className="w-full max-w-xs gap-2"
          disabled={isPending}
          onClick={() => void handleNewConversation()}
        >
          {isPending ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <MessageSquarePlusIcon className="size-4" />
          )}

          Cuộc trò chuyện mới
        </Button>

        <Button
          variant="ghost"
          onClick={() => setScreen("inbox")}
        >
          <HistoryIcon className="mr-2 size-4" />
          Xem lịch sử trò chuyện
        </Button>
      </main>

      <WidgetFooter />
    </div>
  );
};
