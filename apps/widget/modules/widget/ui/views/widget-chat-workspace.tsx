"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  ArrowUp,
  Bot,
  ChevronDown,
  Loader2,
  Menu,
  MessageCircle,
  PanelLeftClose,
  Search,
  SquarePen,
  X,
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
  type WidgetTypingStatus,
} from "@/lib/widget-api";
import {
  dateSeparatorLabel,
  isSameDay,
  messageTime,
} from "../components/widget-message-format";
import { WidgetMarkdown } from "../components/widget-markdown";

type ChatItem = WidgetConversation & {
  title: string;
};

type PendingMessage = {
  organizationId: string;
  conversationId: string | null;
  content: string;
  clientMessageId: string;
};

type ChatMessage = WidgetMessage & {
  deliveryStatus?: "sending" | "failed";
};

const sortMessages = (items: ChatMessage[]) =>
  [...items].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
      a.id.localeCompare(b.id),
  );

const mergeMessages = (
  previous: ChatMessage[],
  incoming: ChatMessage[],
) => {
  const serverClientMessageIds = new Set(
    incoming
      .map((message) => message.clientMessageId)
      .filter((id): id is string => Boolean(id)),
  );
  const map = new Map<string, ChatMessage>();

  for (const message of previous) {
    if (
      message.deliveryStatus &&
      message.clientMessageId &&
      serverClientMessageIds.has(message.clientMessageId)
    ) {
      continue;
    }
    map.set(message.id, message);
  }

  for (const message of incoming) {
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<WidgetConversation | null>(
    null,
  );

  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingStatus, setTypingStatus] = useState<WidgetTypingStatus>({
    kind: "none",
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const pendingMessageRef = useRef<PendingMessage | null>(null);
  const stickToLatestRef = useRef(true);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);

  // MVP-01.2: Lấy câu hỏi gợi ý đã lưu từ Dashboard.
  const suggestions = Object.values(settings?.defaultSuggestions ?? {})
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    .map((value) => value.trim())
    .slice(0, 3);

  const getToken = useCallback(() => {
    return organizationId ? widgetSession.get(organizationId) : null;
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
      const conversations = await widgetApi.listConversations(token);

      const results = await Promise.all(
        conversations.map(async (item) => {
          let title = "Cuộc trò chuyện mới";

          try {
            const page = await widgetApi.listMessages(token, item.id);

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
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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

    pendingMessageRef.current = null;
    widgetConversationStorage.set(organizationId, id);
    setConversationId(id);
    setSidebarOpen(false);
    setError(null);
  };

  const newChat = () => {
    if (sendingRef.current) return;

    pendingMessageRef.current = null;
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

    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setMessages([]);
      setHasMore(false);
      setNextBefore(null);
      setLoadingMessages(false);
      setTypingStatus({ kind: "none" });
      return;
    }

    const token = getToken();
    if (!token) return;

    let cancelled = false;

    setLoadingMessages(true);
    // Preserve messages already associated with this conversation while its
    // initial page is loading. This keeps the first optimistic bubble stable;
    // the server response/poll reconciles it by clientMessageId.
    setMessages((previous) => previous.filter(
      (message) => message.conversationId === conversationId,
    ));
    setConversation(null);
    setHasMore(false);
    setNextBefore(null);

    const load = async () => {
      try {
        const [details, page, typing] = await Promise.all([
          widgetApi.getConversation(token, conversationId),
          widgetApi.listMessages(token, conversationId),
          widgetApi.getTypingStatus(token, conversationId),
        ]);

        if (cancelled) return;

        setConversation(details);
        setMessages(sortMessages(page.items));
        setHasMore(page.hasMore);
        setNextBefore(page.nextBefore);
        setTypingStatus(typing);
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
      if (busy || document.visibilityState !== "visible") {
        return;
      }

      busy = true;

      try {
        const [details, page, typing] = await Promise.all([
          widgetApi.getConversation(token, conversationId),
          widgetApi.listMessages(token, conversationId),
          widgetApi.getTypingStatus(token, conversationId),
        ]);

        if (!active) return;

        setConversation(details);
        setMessages((previous) => mergeMessages(previous, page.items));
        setTypingStatus(typing);
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

  const scrollToLatest = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = messageScrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
    stickToLatestRef.current = true;
    setShowScrollToLatest(false);
  }, []);

  useEffect(() => {
    stickToLatestRef.current = true;
    requestAnimationFrame(() => scrollToLatest("auto"));
  }, [conversationId, scrollToLatest]);

  useEffect(() => {
    if (stickToLatestRef.current) {
      scrollToLatest(messages.length > 0 ? "smooth" : "auto");
    }
  }, [messages.length, scrollToLatest]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
  }, [draft]);

  const loadMore = async () => {
    const token = getToken();

    if (!token || !conversationId || !nextBefore || loadingMore) {
      return;
    }

    setLoadingMore(true);

    try {
      const page = await widgetApi.listMessages(
        token,
        conversationId,
        nextBefore,
      );

      setMessages((previous) => mergeMessages(previous, page.items));
      setHasMore(page.hasMore);
      setNextBefore(page.nextBefore);
    } catch (err) {
      console.error("Load older messages failed", err);
      setError("Không thể tải tin nhắn cũ.");
    } finally {
      setLoadingMore(false);
    }
  };

  const replaceOptimisticMessage = useCallback((message: WidgetMessage) => {
    setMessages((previous) => mergeMessages(previous, [message]));
  }, []);

  const markMessageFailed = useCallback((clientMessageId: string) => {
    setMessages((previous) => previous.map((message) => (
      message.clientMessageId === clientMessageId
        ? { ...message, deliveryStatus: "failed" as const }
        : message
    )));
  }, []);

  const reconcileMessage = useCallback(async (
    token: string,
    id: string,
    clientMessageId: string,
  ): Promise<boolean> => {
    try {
      const page = await widgetApi.listMessages(token, id);
      const confirmed = page.items.find(
        (message) => message.clientMessageId === clientMessageId,
      );
      if (!confirmed) return false;
      replaceOptimisticMessage(confirmed);
      return true;
    } catch {
      // The original request may still be in flight; retain the failed bubble
      // so the visitor can retry with the same idempotency key.
      return false;
    }
  }, [replaceOptimisticMessage]);

  // Sends an existing failed message or a new draft. The backend treats
  // clientMessageId as the idempotency key, so retry never creates a second
  // persisted user message for the same action.
  const sendMessage = async (
    suggestedContent?: string,
    retry?: Pick<ChatMessage, "clientMessageId" | "content">,
  ) => {
    const content = (retry?.content ?? suggestedContent ?? draft).trim();

    if (
      !content ||
      !organizationId ||
      sendingRef.current ||
      loadingMessages ||
      conversation?.status === "resolved"
    ) {
      return;
    }

    const clientMessageId = retry?.clientMessageId ?? crypto.randomUUID();
    const optimisticId = `optimistic:${clientMessageId}`;

    pendingMessageRef.current = {
      organizationId,
      conversationId,
      content,
      clientMessageId,
    };

    if (!retry) {
      setMessages((previous) => mergeMessages(previous, [{
        id: optimisticId,
        conversationId: conversationId ?? optimisticId,
        role: "user",
        content,
        clientMessageId,
        createdAt: new Date().toISOString(),
        deliveryStatus: "sending",
      }]));
      setDraft("");
    } else {
      setMessages((previous) => previous.map((message) => (
        message.clientMessageId === clientMessageId
          ? { ...message, deliveryStatus: "sending" as const }
          : message
      )));
    }

    sendingRef.current = true;
    setSending(true);
    setError(null);
    let token = getToken();

    try {
      // 1. Tạo Guest Session nếu chưa có.
      if (!token) {
        const guest = await widgetApi.createGuestSession(organizationId);

        token = guest.token;

        widgetSession.set(organizationId, guest.token);

        setContactSessionId(guest.contactSessionId);
      }

      // 2. Tạo conversation nếu chưa có.
      // Giữ ID để retry không tạo trùng.
      let id =
        conversationId ?? pendingMessageRef.current?.conversationId ?? null;

      if (!id) {
        const created = await widgetApi.createConversation(token);

        id = created.id;

        widgetConversationStorage.set(organizationId, created.id);

        setChats((previous) => [
          {
            ...created,
            title: content,
          },
          ...previous.filter((chat) => chat.id !== created.id),
        ]);
      }

      if (pendingMessageRef.current) {
        pendingMessageRef.current.conversationId = id;
      }

      setMessages((previous) => previous.map((message) => (
        message.clientMessageId === clientMessageId
          ? { ...message, conversationId: id }
          : message
      )));

      // 3. Gửi tin nhắn với UUID chống trùng.
      const message = await widgetApi.sendMessage(
        token,
        id,
        content,
        clientMessageId,
      );

      // 4. Reconcile optimistic bubble with authoritative server time/ID.
      replaceOptimisticMessage(message);

      // 5. Chuyển sang conversation vừa tạo.
      if (conversationId !== id) {
        setConversationId(id);
      }

      // 6. Cập nhật tiêu đề lịch sử.
      setChats((previous) =>
        previous.map((chat) =>
          chat.id === id && chat.title === "Cuộc trò chuyện mới"
            ? { ...chat, title: content }
            : chat,
        ),
      );

      pendingMessageRef.current = null;

      // 7. Đồng bộ lịch sử.
      void loadChats();
    } catch (err) {
      console.error("Send message failed", err);

      if (err instanceof WidgetApiError && err.status === 401) {
        widgetSession.clear(organizationId);
        pendingMessageRef.current = null;

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
        const id = pendingMessageRef.current?.conversationId;
        if (id && await reconcileMessage(token ?? "", id, clientMessageId)) {
          pendingMessageRef.current = null;
          return;
        }
        markMessageFailed(clientMessageId);
        setError("Không thể gửi tin nhắn. Vui lòng thử lại.");
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const filteredChats = chats.filter((chat) =>
    chat.title
      .toLocaleLowerCase("vi-VN")
      .includes(search.trim().toLocaleLowerCase("vi-VN")),
  );

  const isResolved = conversation?.status === "resolved";
  const closeWidget = () => {
    if (window.parent !== window) {
      // The host embed script verifies this frame's origin and source before
      // acting on this non-sensitive close request.
      window.parent.postMessage({ type: "close" }, "*");
    }
  };

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
              onChange={(event) => setSearch(event.target.value)}
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
                  conversationId === chat.id ? "bg-zinc-200/80" : "",
                ].join(" ")}
                title={chat.title}
              >
                {chat.title}
              </button>
            ))}

          {!loadingChats && filteredChats.length === 0 && (
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
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-100 bg-white/95 px-3 sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen((value) => !value)}
              className="rounded-lg p-2 hover:bg-zinc-100"
              aria-label="Mở hoặc đóng lịch sử"
            >
              <Menu className="size-5" />
            </button>

            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
                <Bot className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold sm:text-base">Hỗ trợ khách hàng</p>
                <p className="truncate text-[11px] text-zinc-500">
                  {isResolved ? "Cuộc trò chuyện đã kết thúc" : "Trợ lý hỗ trợ"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button type="button" onClick={newChat} className="rounded-lg p-2 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới">
              <SquarePen className="size-5" />
            </button>
            <button type="button" onClick={closeWidget} className="rounded-lg p-2 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" title="Đóng hỗ trợ" aria-label="Đóng hỗ trợ">
              <X className="size-5" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {!conversationId && messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-6 text-center">
              <div className="mb-5 flex size-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100">
                <MessageCircle className="size-6" />
              </div>

              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Xin chào!
              </h1>

              {/* Lời chào từ Widget Settings */}
              <p className="mt-3 max-w-md whitespace-pre-wrap text-sm leading-6 text-zinc-500">
                {settings?.greetMessage?.trim() ||
                  "Chúng tôi có thể giúp gì cho bạn hôm nay?"}
              </p>

              {/* MVP-01.2: Câu hỏi gợi ý */}
              {suggestions.length > 0 && (
                <div className="mt-7 flex w-full max-w-md flex-col gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${index}-${suggestion}`}
                      type="button"
                      disabled={sending || loadingMessages}
                      onClick={() => {
                        void sendMessage(suggestion);
                      }}
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm leading-5 text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div
              ref={messageScrollRef}
              onScroll={(event) => {
                const target = event.currentTarget;
                const nearLatest = target.scrollHeight - target.scrollTop - target.clientHeight < 72;
                stickToLatestRef.current = nearLatest;
                setShowScrollToLatest(!nearLatest);
              }}
              className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 [scrollbar-color:#d4d4d8_transparent] [scrollbar-width:thin] sm:px-5"
            >
              <div className="mx-auto w-full max-w-3xl py-6">
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
                    {loadingMore ? "Đang tải..." : "Xem tin nhắn cũ hơn"}
                  </button>
                )}

                {messages.map((message, index) => {
                  const isUser = message.role === "user";
                  const previous = messages[index - 1];
                  const startsDay = !previous || !isSameDay(
                    new Date(message.createdAt),
                    new Date(previous.createdAt),
                  );
                  const grouped = previous
                    && previous.role === message.role
                    && previous.senderId === message.senderId
                    && !startsDay;

                  return (
                    <div key={message.id}>
                      {startsDay && (
                        <div className="my-6 flex items-center gap-3" aria-label={dateSeparatorLabel(message.createdAt)}>
                          <div className="h-px flex-1 bg-zinc-100" />
                          <span className="text-[11px] font-medium text-zinc-400">{dateSeparatorLabel(message.createdAt)}</span>
                          <div className="h-px flex-1 bg-zinc-100" />
                        </div>
                      )}
                      <div className={["flex w-full", grouped ? "mt-1" : "mt-5", isUser ? "justify-end" : "justify-start"].join(" ")}>
                        <div className="flex max-w-[88%] flex-col gap-1 sm:max-w-[80%]">
                          {!isUser && !grouped && (
                            <span className="px-1 text-[11px] font-medium text-zinc-500">
                              {message.senderId ? "Nhân viên hỗ trợ" : "Trợ lý AI"}
                            </span>
                          )}
                          <div className={[
                            "min-w-0 break-words text-sm leading-6",
                            isUser ? "rounded-2xl rounded-br-md bg-zinc-900 px-3.5 py-2.5 text-white" : "rounded-2xl rounded-bl-md border border-zinc-100 bg-zinc-50 px-3.5 py-2.5 text-zinc-800",
                          ].join(" ")}>
                            {isUser ? <div className="whitespace-pre-wrap">{message.content}</div> : <WidgetMarkdown content={message.content} />}
                          </div>
                          <div className={["flex items-center gap-1 px-1 text-[11px] text-zinc-400", isUser ? "self-end" : "self-start"].join(" ")}>
                            {message.deliveryStatus === "sending" ? (
                              <><Loader2 className="size-3 animate-spin" aria-hidden="true" /><span>Đang gửi</span></>
                            ) : message.deliveryStatus === "failed" ? (
                              <>
                                <span className="text-red-500">Gửi thất bại</span>
                                {message.clientMessageId && (
                                  <button
                                    type="button"
                                    onClick={() => void sendMessage(undefined, message)}
                                    disabled={sending}
                                    className="font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-950 disabled:opacity-50"
                                  >
                                    Thử lại
                                  </button>
                                )}
                              </>
                            ) : isUser ? <span>Đã gửi · {messageTime(message.createdAt)}</span> : <time dateTime={message.createdAt}>{messageTime(message.createdAt)}</time>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {typingStatus.kind !== "none" && (
                  <div className="mt-4 flex items-center gap-2 px-1 text-xs text-zinc-500" role="status" aria-live="polite">
                    <span className="flex gap-1" aria-hidden="true">
                      <span className="size-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.2s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.1s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-zinc-400" />
                    </span>
                    {typingStatus.kind === "human"
                      ? "Nhân viên đang nhập..."
                      : "Trợ lý AI đang trả lời..."}
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
              {showScrollToLatest && (
                <button type="button" onClick={() => scrollToLatest()} className="sticky bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-medium shadow-md hover:bg-zinc-50" aria-label="Xuống tin nhắn mới nhất">
                  <ChevronDown className="mr-1 inline size-4" /> Xuống mới nhất
                </button>
              )}
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

          <div className="shrink-0 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
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
                <div className="rounded-[24px] border border-zinc-200 bg-white px-4 py-3 shadow-sm transition-colors focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-100">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
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
                    placeholder="Nhập câu hỏi của bạn..."
                    aria-label="Nhập tin nhắn"
                    rows={1}
                    disabled={loadingMessages}
                    className="max-h-36 min-h-6 w-full resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-zinc-400 disabled:opacity-50"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">{sending ? "Đang gửi..." : "Enter để gửi · Shift + Enter xuống dòng"}</span>

                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={!draft.trim() || sending || loadingMessages}
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
