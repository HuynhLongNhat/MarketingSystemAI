
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ArrowUpRight,
  Inbox,
  RefreshCw,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";

import {
  handoffApi,
  type HandoffFilter,
  type HandoffQueueItem,
} from "@/lib/handoff-api";

const POLLING_INTERVAL = 5000;

const FILTERS: {
  value: HandoffFilter;
  label: string;
}[] = [
  { value: "all", label: "Tất cả" },
  { value: "unassigned", label: "Chưa nhận" },
  { value: "mine", label: "Của tôi" },
];

export const ConversationsView = () => {
  const [filter, setFilter] = useState<HandoffFilter>("all");
  const [items, setItems] = useState<HandoffQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const loadQueue = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await handoffApi.listQueue(filter);
      setItems(result);
    } catch (error) {
      console.error("Failed to load handoff queue:", error);

      if (!silent) {
        toast.error("Không thể tải hàng đợi hỗ trợ.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadQueue();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadQueue(true);
      }
    }, POLLING_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadQueue(true);
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(interval);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [loadQueue]);

  const handleClaim = async (conversationId: string) => {
    if (claimingId) {
      return;
    }

    setClaimingId(conversationId);

    try {
      await handoffApi.claim(conversationId);

      toast.success("Bạn đã nhận hội thoại.");

      await loadQueue(true);
    } catch (error) {
      console.error("Failed to claim conversation:", error);

      toast.error(
        "Không thể nhận hội thoại. Có thể nhân viên khác đã nhận.",
      );

      await loadQueue(true);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="size-5" />
            <h1 className="text-lg font-semibold">
              Human Handoff
            </h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý các hội thoại cần nhân viên hỗ trợ.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={refreshing}
          onClick={() => void loadQueue(true)}
        >
          <RefreshCw
            className={`mr-2 size-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          Làm mới
        </Button>
      </header>

      <div className="flex items-center gap-2 border-b px-5 py-3">
        {FILTERS.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={filter === item.value ? "default" : "outline"}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}

        <span className="ml-auto text-sm text-muted-foreground">
          {items.length} hội thoại
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="space-y-2 rounded-lg border p-4"
              >
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
            <div className="mb-3 rounded-full bg-muted p-4">
              <Inbox className="size-7 text-muted-foreground" />
            </div>

            <h2 className="font-medium">
              Không có hội thoại nào
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Các yêu cầu hỗ trợ từ khách hàng sẽ xuất hiện ở đây.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const name =
                item.contactSession.name?.trim() ||
                "Khách truy cập";

              const isUnassigned = !item.assignedToUserId;
              const isClaiming = claimingId === item.id;

              return (
                <article
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-medium">
                        {name}
                      </h3>

                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          isUnassigned
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {isUnassigned
                          ? "Chưa có người nhận"
                          : "Đang được tiếp quản"}
                      </span>
                    </div>

                    <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                      {item.contactSession.email && (
                        <p>{item.contactSession.email}</p>
                      )}

                      {item.contactSession.phone && (
                        <p>{item.contactSession.phone}</p>
                      )}

                      <p>
                        Cập nhật{" "}
                        {formatDistanceToNow(
                          new Date(item.updatedAt),
                          {
                            addSuffix: true,
                            locale: vi,
                          },
                        )}
                      </p>

                      {item.assignee && (
                        <p className="flex items-center gap-1">
                          <UserRoundCheck className="size-3.5" />
                          {item.assignee.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isUnassigned ? (
                      <Button
                        size="sm"
                        disabled={Boolean(claimingId)}
                        onClick={() => void handleClaim(item.id)}
                      >
                        <UserRound className="mr-2 size-4" />
                        {isClaiming ? "Đang nhận..." : "Nhận hội thoại"}
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/conversations/${item.id}`}>
                          Mở hội thoại
                          <ArrowUpRight className="ml-2 size-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
