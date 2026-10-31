
"use client";

import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  ArrowRight,
  History,
  Loader2,
  MessageCircle,
  Plus,
} from "lucide-react";

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

  const [isCreating, setIsCreating] = useState(false);

  const createConversation = async () => {
    if (!organizationId || isCreating) return;

    const token = widgetSession.get(organizationId);

    if (!token) {
      setScreen("auth");
      return;
    }

    setIsCreating(true);

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

      setErrorMessage(
        "Không thể tạo cuộc trò chuyện. Vui lòng thử lại.",
      );

      setScreen("error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-5 text-primary" />

          <h1 className="text-base font-semibold">
            Hỗ trợ khách hàng
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setScreen("inbox")}
          aria-label="Lịch sử trò chuyện"
          title="Lịch sử trò chuyện"
          className="rounded-lg p-2 hover:bg-muted"
        >
          <History className="size-5" />
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10">
              <MessageCircle className="size-8 text-primary" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                Xin chào!
              </h2>

              <p className="text-sm leading-6 text-muted-foreground">
                Bạn cần hỗ trợ điều gì hôm nay?
                <br />
                Hãy bắt đầu cuộc trò chuyện với chúng tôi.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void createConversation()}
            disabled={isCreating}
            className="flex w-full items-center justify-between rounded-2xl border bg-card px-5 py-4 text-left shadow-sm transition-colors hover:bg-muted disabled:opacity-50"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                {isCreating ? (
                  <Loader2 className="size-5 animate-spin text-primary" />
                ) : (
                  <Plus className="size-5 text-primary" />
                )}
              </span>

              <span className="text-sm font-medium">
                {isCreating
                  ? "Đang tạo cuộc trò chuyện..."
                  : "Cuộc trò chuyện mới"}
              </span>
            </span>

            <ArrowRight className="size-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => setScreen("inbox")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <History className="size-4" />
            Xem lịch sử trò chuyện
          </button>
        </div>
      </main>

      <footer className="shrink-0 border-t px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">
          Chúng tôi luôn sẵn sàng hỗ trợ bạn.
        </p>
      </footer>
    </div>
  );
};
