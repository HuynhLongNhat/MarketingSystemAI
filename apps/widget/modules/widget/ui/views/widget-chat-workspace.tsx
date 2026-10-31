
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  ArrowUp,
  Loader2,
  Menu,
  MessageCircle,
  PanelLeftClose,
  Search,
  SquarePen,
} from "lucide-react";

import {
  contactSessionIdAtomFamily,
  conversationIdAtom,
  organizationIdAtom,
  widgetSettingsAtom,
} from "../../atoms/widget-atoms";

import {
  widgetApi,
  WidgetApiError,
  widgetConversationStorage,
  widgetSession,
  type WidgetConversation,
  type WidgetMessage,
} from "@/lib/widget-api";

type ChatItem = WidgetConversation & {
  title: string;
};

const sortMessages = (items: WidgetMessage[]) =>
  [...items].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime() ||
      a.id.localeCompare(b.id),
  );

const mergeMessages = (
  previous: WidgetMessage[],
  incoming: WidgetMessage[],
) => {
  const map = new Map<string, WidgetMessage>();

  for (const message of [...previous, ...incoming]) {
    map.set(message.id, message);
  }

  return sortMessages(Array.from(map.values()));
};

export const WidgetChatWorkspace = () => {
  const organizationId = useAtomValue(organizationIdAtom);
  const conversationId = useAtomValue(conversationIdAtom);
  const settings = useAtomValue(widgetSettingsAtom);

  const setConversationId = useSetAtom(conversationIdAtom);
  const setContactSessionId = useSetAtom(
    contactSessionIdAtomFamily(organizationId ?? ""),
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [conversation, setConversation] =
    useState<WidgetConversation | null>(null);

  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(
    null,
  );
  const [loadingMore, setLoadingMore] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);

  const getToken = useCallback(() => {
    return organizationId
      ? widgetSession.get(organizationId)
      : null;
  }, [organizationId]);

  const loadChats = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setChats([]);
      setLoadingChats(false);
      return;
    }

    setLoadingChats(true);

    try {
      const conversations =
        await widgetApi.listConversations(token);

      const results = await Promise.all(
        conversations.map(async (item) => {
          let title = "Cuộc trò chuyện mới";

          try {
            const page = await widgetApi.listMessages(
              token,
              item.id,
            );

            const firstMessage = page.items.find(
              (message) => message.role === "user",
            );

            if (firstMessage?.content) {
              title = firstMessage.content;
            }
          } catch {
            // Không chặn lịch sử nếu preview bị lỗi.
          }

          return { ...item, title };
        }),
      );

      results.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );

      setChats(results);
    } catch (err) {
      console.error("Load conversations failed", err);

      setError("Không thể tải lịch sử trò chuyện.");
    } finally {
      setLoadingChats(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  const openChat = (id: string) => {
    if (!organizationId || sendingRef.current) return;

    widgetConversationStorage.set(organizationId, id);
    setConversationId(id);
    setSidebarOpen(false);
    setError(null);
  };

  const newChat = () => {
    if (sendingRef.current) return;

    setConversationId(null);
    setConversation(null);
    setMessages([]);
    setDraft("");
    setHasMore(false);
    setNextBefore(null);
    setError(null);
    setSidebarOpen(false);

    if (organizationId) {
      widgetConversationStorage.clear(organizationId);
    }

    requestAnimationFrame(() =>
      textareaRef.current?.focus(),
    );
  };

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setMessages([]);
      setHasMore(false);
      setNextBefore(null);
      setLoadingMessages(false);
      return;
    }

    const token = getToken();
    if (!token) return;

    let cancelled = false;

    setLoadingMessages(true);
    setMessages([]);
    setConversation(null);
    setHasMore(false);
    setNextBefore(null);

    const load = async () => {
      try {
        const [details, page] = await Promise.all([
          widgetApi.getConversation(token, conversationId),
          widgetApi.listMessages(token, conversationId),
        ]);

        if (cancelled) return;

        setConversation(details);
        setMessages(sortMessages(page.items));
        setHasMore(page.hasMore);
        setNextBefore(page.nextBefore);
        setError(null);
      } catch (err) {
        if (cancelled) return;

        console.error("Load messages failed", err);
        setError("Không thể tải tin nhắn.");
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [conversationId, getToken]);

  useEffect(() => {
    if (!conversationId) return;

    const token = getToken();
    if (!token) return;

    let active = true;
    let busy = false;

    const refresh = async () => {
      if (
        busy ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      busy = true;

      try {
        const [details, page] = await Promise.all([
          widgetApi.getConversation(token, conversationId),
          widgetApi.listMessages(token, conversationId),
        ]);

        if (!active) return;

        setConversation(details);
        setMessages((previous) =>
          mergeMessages(previous, page.items),
        );
      } catch (err) {
        console.error("Refresh messages failed", err);
      } finally {
        busy = false;
      }
    };

    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [conversationId, getToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length, conversationId]);

  const loadMore = async () => {
    const token = getToken();

    if (
      !token ||
      !conversationId ||
      !nextBefore ||
      loadingMore
    ) {
      return;
    }

    setLoadingMore(true);

    try {
      const page = await widgetApi.listMessages(
        token,
        conversationId,
        nextBefore,
      );

      setMessages((previous) =>
        mergeMessages(previous, page.items),
      );
      setHasMore(page.hasMore);
      setNextBefore(page.nextBefore);
    } catch (err) {
      console.error("Load older messages failed", err);
      setError("Không thể tải tin nhắn cũ.");
    } finally {
      setLoadingMore(false);
    }
  };

  const sendMessage = async () => {
    const content = draft.trim();

    if (
      !content ||
      !organizationId ||
      sendingRef.current ||
      loadingMessages ||
      conversation?.status === "resolved"
    ) {
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setError(null);

    try {
      let token = getToken();

      // 1. Khách chưa có session:
      // tạo Guest Session khi gửi tin đầu tiên.
      if (!token) {
        const guest =
          await widgetApi.createGuestSession(
            organizationId,
          );

        token = guest.token;

        widgetSession.set(
          organizationId,
          guest.token,
        );

        setContactSessionId(
          guest.contactSessionId,
        );
      }

      // 2. Tạo conversation nếu chưa có.
      let id = conversationId;

      if (!id) {
        const created =
          await widgetApi.createConversation(token);

        id = created.id;

        widgetConversationStorage.set(
          organizationId,
          created.id,
        );

        setChats((previous) => [
          {
            ...created,
            title: content,
          },
          ...previous.filter(
            (chat) => chat.id !== created.id,
          ),
        ]);
      }

      // 3. Gửi tin nhắn.
      const message = await widgetApi.sendMessage(
        token,
        id,
        content,
      );

      // 4. Chuyển sang conversation vừa tạo.
      // Effect sẽ tải cả lời chào và tin nhắn.
      if (conversationId !== id) {
        setConversationId(id);
      } else {
        setMessages((previous) =>
          mergeMessages(previous, [message]),
        );
      }

      // 5. Cập nhật tiêu đề trong sidebar.
      setChats((previous) =>
        previous.map((chat) =>
          chat.id === id &&
          chat.title === "Cuộc trò chuyện mới"
            ? { ...chat, title: content }
            : chat,
        ),
      );

      setDraft("");

      // 6. Đồng bộ lịch sử.
      void loadChats();
    } catch (err) {
      console.error("Send message failed", err);

      if (
        err instanceof WidgetApiError &&
        err.status === 401
      ) {
        // Backend xác nhận token hết hạn hoặc sai.
        // Xóa phiên cũ nhưng giữ nội dung đang nhập.
        widgetSession.clear(organizationId);

        setContactSessionId(null);
        setConversationId(null);
        setConversation(null);
        setMessages([]);
        setChats([]);
        setLoadingChats(false);
        setHasMore(false);
        setNextBefore(null);

        setError(
          "Phiên trò chuyện đã hết hạn. Vui lòng gửi lại tin nhắn để bắt đầu phiên mới.",
        );
      } else {
        setError(
          "Không thể gửi tin nhắn. Vui lòng thử lại.",
        );
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const filteredChats = chats.filter((chat) =>
    chat.title
      .toLocaleLowerCase("vi-VN")
      .includes(
        search.trim().toLocaleLowerCase("vi-VN"),
      ),
  );

  const isResolved =
    conversation?.status === "resolved";

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-white text-zinc-900">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng thanh bên"
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 z-20 bg-black/30 md:hidden"
        />
      )}

      <aside
        className={[
          "z-30 flex h-full shrink-0 flex-col border-r border-zinc-200 bg-[#f9f9f9] transition-all duration-200",
          "absolute inset-y-0 left-0 md:relative",
          sidebarOpen
            ? "w-[min(290px,85vw)] translate-x-0"
            : "w-[min(290px,85vw)] -translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden md:border-0",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-3 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 hover:bg-zinc-200/70"
            aria-label="Đóng sidebar"
          >
            <PanelLeftClose className="size-5" />
          </button>

          <button
            type="button"
            onClick={newChat}
            className="rounded-lg p-2 hover:bg-zinc-200/70"
            aria-label="Cuộc trò chuyện mới"
            title="Cuộc trò chuyện mới"
          >
            <SquarePen className="size-5" />
          </button>
        </div>

        <div className="space-y-1 px-3">
          <button
            type="button"
            onClick={newChat}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-zinc-200/70"
          >
            <SquarePen className="size-4" />
            Cuộc trò chuyện mới
          </button>

          <div className="flex items-center gap-2 rounded-lg px-3 py-2">
            <Search className="size-4 text-zinc-500" />
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Tìm kiếm đoạn chat"
              aria-label="Tìm kiếm đoạn chat"
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-zinc-500"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-6">
          <p className="mb-2 px-3 text-xs font-semibold text-zinc-500">
            Gần đây
          </p>

          {loadingChats && (
            <div className="flex justify-center py-6">
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}

          {!loadingChats &&
            filteredChats.map((chat) => (
              <button
                type="button"
                key={chat.id}
                onClick={() => openChat(chat.id)}
                className={[
                  "mb-1 block w-full truncate rounded-lg px-3 py-2.5 text-left text-sm hover:bg-zinc-200/70",
                  conversationId === chat.id
                    ? "bg-zinc-200/80"
                    : "",
                ].join(" ")}
                title={chat.title}
              >
                {chat.title}
              </button>
            ))}

          {!loadingChats &&
            filteredChats.length === 0 && (
              <p className="px-3 py-4 text-sm text-zinc-500">
                Không có cuộc trò chuyện.
              </p>
            )}
        </div>

        <div className="border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500">
          Trung tâm hỗ trợ khách hàng
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between px-3 sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSidebarOpen((value) => !value)
              }
              className="rounded-lg p-2 hover:bg-zinc-100"
              aria-label="Mở hoặc đóng lịch sử"
            >
              <Menu className="size-5" />
            </button>

            <span className="truncate text-sm font-semibold sm:text-base">
              Hỗ trợ khách hàng
            </span>
          </div>

          <button
            type="button"
            onClick={newChat}
            className="rounded-lg p-2 hover:bg-zinc-100"
            title="Cuộc trò chuyện mới"
            aria-label="Cuộc trò chuyện mới"
          >
            <SquarePen className="size-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {!conversationId ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
              <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-zinc-100">
                <MessageCircle className="size-6" />
              </div>

              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Xin chào!
              </h1>

              <p className="mt-3 text-sm text-zinc-500">
                Chúng tôi có thể giúp gì cho bạn hôm nay?
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-4">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-7">
                {loadingMessages && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="size-5 animate-spin" />
                  </div>
                )}

                {hasMore && (
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                    className="self-center rounded-full border px-4 py-2 text-xs hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {loadingMore
                      ? "Đang tải..."
                      : "Xem tin nhắn cũ hơn"}
                  </button>
                )}

                {messages.map((message) => {
                  const isUser =
                    message.role === "user";

                  return (
                    <div
                      key={message.id}
                      className={[
                        "flex w-full",
                        isUser
                          ? "justify-end"
                          : "justify-start",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "max-w-[85%] whitespace-pre-wrap break-words text-sm leading-7",
                          isUser
                            ? "rounded-3xl bg-[#f4f4f4] px-4 py-2.5"
                            : "py-1",
                        ].join(" ")}
                      >
                        {message.content}
                      </div>
                    </div>
                  );
                })}

                <div ref={bottomRef} />
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mx-auto w-full max-w-3xl px-4 pb-2 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          <div className="shrink-0 px-3 pb-4 pt-2 sm:px-6">
            <div className="mx-auto w-full max-w-3xl">
              {isResolved ? (
                <div className="rounded-2xl bg-zinc-100 px-4 py-4 text-center text-sm text-zinc-600">
                  Cuộc trò chuyện đã kết thúc.
                  <button
                    type="button"
                    onClick={newChat}
                    className="ml-2 font-semibold underline"
                  >
                    Tạo chat mới
                  </button>
                </div>
              ) : (
                <div className="rounded-[26px] border border-zinc-200 bg-white px-4 py-3 shadow-sm focus-within:border-zinc-300">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(event) =>
                      setDraft(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder="Hỏi bất kỳ điều gì..."
                    aria-label="Nhập tin nhắn"
                    rows={2}
                    disabled={
                      sending || loadingMessages
                    }
                    className="max-h-36 min-h-12 w-full resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-zinc-400 disabled:opacity-50"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">
                      Enter để gửi
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        void sendMessage()
                      }
                      disabled={
                        !draft.trim() ||
                        sending ||
                        loadingMessages
                      }
                      aria-label="Gửi tin nhắn"
                      className="flex size-9 items-center justify-center rounded-full bg-zinc-900 text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-200 disabled:text-zinc-400"
                    >
                      {sending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArrowUp className="size-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <p className="mt-2 text-center text-[11px] text-zinc-400">
                {settings?.greetMessage
                  ? "Đội ngũ hỗ trợ luôn sẵn sàng giúp bạn."
                  : "Hỗ trợ khách hàng trực tuyến"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
