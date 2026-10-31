
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  X,
} from "lucide-react";

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

  const [items, setItems] = useState<ConversationItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    const token = widgetSession.get(organizationId);

    if (!token) {
      setScreen("auth");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const conversations =
          await widgetApi.listConversations(token);

        const results = await Promise.all(
          conversations.map(async (conversation) => {
            let title = "Cuộc trò chuyện mới";

            try {
              const page = await widgetApi.listMessages(
                token,
                conversation.id,
              );

              const userMessage = page.items.find(
                (message) => message.role === "user",
              );

              if (userMessage) {
                title = userMessage.content;
              }
            } catch (err) {
              console.warn("Cannot load chat preview", err);
            }

            return { ...conversation, title };
          }),
        );

        if (!cancelled) {
          setItems(results);
        }
      } catch (err) {
        console.error("Load chat history failed", err);

        if (!cancelled) {
          setError("Không thể tải lịch sử trò chuyện.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [organizationId, setScreen]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("vi-VN");

    if (!keyword) return items;

    return items.filter((item) =>
      item.title.toLocaleLowerCase("vi-VN").includes(keyword),
    );
  }, [items, query]);

  const openConversation = (id: string) => {
    if (!organizationId) return;

    widgetConversationStorage.set(organizationId, id);
    setConversationId(id);
    setScreen("chat");
  };

  const statusLabel = (status: WidgetConversation["status"]) => {
    if (status === "resolved") return "Đã giải quyết";
    if (status === "escalated") return "Đang chuyển nhân viên";
    return "Đang hỗ trợ";
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Quay lại"
            onClick={() => setScreen("chat")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="size-5" />
          </button>

          <h1 className="text-base font-semibold">
            Lịch sử trò chuyện
          </h1>
        </div>

        <button
          type="button"
          aria-label="Tạo cuộc trò chuyện mới"
          title="Cuộc trò chuyện mới"
          onClick={() => setScreen("selection")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <Plus className="size-5" />
        </button>
      </header>

      <div className="shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm cuộc trò chuyện..."
            aria-label="Tìm cuộc trò chuyện"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />

          {query && (
            <button
              type="button"
              aria-label="Xóa tìm kiếm"
              onClick={() => setQuery("")}
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Đang tải lịch sử...
          </div>
        )}

        {error && (
          <p className="px-4 py-8 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
            <div className="rounded-2xl bg-muted p-4">
              <MessageSquare className="size-7 text-muted-foreground" />
            </div>

            <h2 className="font-medium">
              Chưa có cuộc trò chuyện
            </h2>

            <p className="text-sm text-muted-foreground">
              Bắt đầu một cuộc trò chuyện để nhận hỗ trợ.
            </p>

            <button
              type="button"
              onClick={() => setScreen("selection")}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Bắt đầu trò chuyện
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          items.length > 0 &&
          filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Không tìm thấy cuộc trò chuyện phù hợp.
            </p>
          )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <p className="px-3 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Gần đây
            </p>

            <div className="space-y-1">
              {filtered.map((conversation) => {
                const active =
                  organizationId !== null &&
                  widgetConversationStorage.get(
                    organizationId,
                  ) === conversation.id;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() =>
                      openConversation(conversation.id)
                    }
                    className={[
                      "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                      active
                        ? "bg-muted"
                        : "hover:bg-muted/70",
                    ].join(" ")}
                  >
                    <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

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
                );
              })}
            </div>
          </>
        )}
      </main>

      <footer className="shrink-0 border-t p-3">
        <button
          type="button"
          onClick={() => setScreen("selection")}
          className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Plus className="size-4" />
          Cuộc trò chuyện mới
        </button>
      </footer>
    </div>
  );
};
