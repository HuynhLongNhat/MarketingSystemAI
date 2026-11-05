"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  MessageSquare,
  UserRoundCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

import { Button } from "@workspace/ui/components/button";

import {
  notificationsApi,
  type AppNotification,
} from "@/lib/notifications-api";

const POLLING_INTERVAL = 30_000;

function formatNotificationTime(value: string) {
  return formatDistanceToNow(new Date(value), {
    addSuffix: true,
    locale: vi,
  });
}

export function NotificationBell() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const result = await notificationsApi.list(30);
      setItems(result.items);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadNotifications();
      }
    }, POLLING_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadNotifications();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (open) {
      void loadNotifications(true);
    }
  }, [open, loadNotifications]);

  const handleOpenNotification = async (item: AppNotification) => {
    if (openingId) {
      return;
    }

    setOpeningId(item.id);

    try {
      if (!item.readAt) {
        await notificationsApi.markRead(item.id);

        setItems((current) =>
          current.map((notification) =>
            notification.id === item.id
              ? { ...notification, readAt: new Date().toISOString() }
              : notification,
          ),
        );

        setUnreadCount((current) => Math.max(0, current - 1));
      }

      setOpen(false);
      router.push(`/conversations/${encodeURIComponent(item.conversationId)}`);
    } catch (error) {
      console.error("Failed to open notification:", error);
    } finally {
      setOpeningId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) {
      return;
    }

    setMarkingAll(true);

    try {
      await notificationsApi.markAllRead();

      const now = new Date().toISOString();

      setItems((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? now,
        })),
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative size-9 shrink-0"
        aria-label={`Thông báo${unreadCount > 0 ? `, ${unreadCount} chưa đọc` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="size-4" />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute left-0 top-full z-[100] mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Thông báo</h2>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} thông báo chưa đọc`
                  : "Bạn đã đọc tất cả thông báo"}
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              disabled={markingAll || unreadCount === 0}
              onClick={() => void handleMarkAllRead()}
            >
              <CheckCheck className="mr-1.5 size-3.5" />
              Đọc tất cả
            </Button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Đang tải thông báo...
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <div className="mb-3 rounded-full bg-muted p-3">
                  <Bell className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Chưa có thông báo</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Thông báo hội thoại sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {items.map((item) => {
                  const isUnread = !item.readAt;
                  const isAssigned =
                    item.type === "conversation_assigned";

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={Boolean(openingId)}
                      onClick={() => void handleOpenNotification(item)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/70 disabled:opacity-60 ${
                        isUnread ? "bg-primary/[0.04]" : "bg-background"
                      }`}
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        {isAssigned ? (
                          <UserRoundCheck className="size-4 text-blue-600" />
                        ) : (
                          <MessageSquare className="size-4 text-amber-600" />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium">
                            {item.title}
                          </span>

                          {isUnread && (
                            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-600" />
                          )}
                        </span>

                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {item.body}
                        </span>

                        <span className="mt-1.5 block text-[11px] text-muted-foreground">
                          {formatNotificationTime(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t px-4 py-2">
            <p className="text-center text-[11px] text-muted-foreground">
              Tự động cập nhật mỗi 30 giây
            </p>
          </div>
        </div>
      )}
    </div>
  );
}