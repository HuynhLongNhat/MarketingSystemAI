
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai/react";

import {
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  ListIcon,
} from "lucide-react";

import {
  conversationsApi,
  type ConversationWithContact,
  type ConversationStatus,
} from "@/lib/conversations-api";

import {
  getCountryFlagUrl,
  getCountryFromTimezone,
} from "@/lib/country-utils";

import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ConversationStatusIcon } from "@workspace/ui/components/conversation-status-icon";
import { cn } from "@workspace/ui/lib/utils";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { statusFilterAtom } from "../../atoms";

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<ConversationStatus, string> = {
  unresolved: "AI đang hỗ trợ",
  escalated: "Nhân viên tiếp quản",
  resolved: "Đã kết thúc",
};

export const ConversationsPanel = () => {
  const pathname = usePathname();

  const statusFilter = useAtomValue(statusFilterAtom);
  const setStatusFilter = useSetAtom(statusFilterAtom);

  const [items, setItems] = useState<ConversationWithContact[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestVersion = useRef(0);
  const loadingMoreRef = useRef(false);

  const status =
    statusFilter === "all"
      ? undefined
      : (statusFilter as ConversationStatus);

  const loadFirstPage = useCallback(async () => {
    const version = ++requestVersion.current;

    setLoading(true);
    setError(null);
    setItems([]);
    setCursor(null);
    setHasMore(false);

    try {
      const result = await conversationsApi.listPage({
        status,
        limit: PAGE_SIZE,
      });

      if (version !== requestVersion.current) return;

      setItems(result.items);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      if (version !== requestVersion.current) return;

      console.error("Failed to load conversations:", err);
      setError("Không thể tải danh sách hội thoại.");
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
      }
    }
  }, [status]);

  useEffect(() => {
    void loadFirstPage();

    return () => {
      requestVersion.current += 1;
    };
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (
      loading ||
      loadingMoreRef.current ||
      !hasMore ||
      !cursor
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);

    const version = requestVersion.current;

    try {
      const result = await conversationsApi.listPage({
        status,
        cursor,
        limit: PAGE_SIZE,
      });

      if (version !== requestVersion.current) return;

      setItems((current) => {
        const existingIds = new Set(
          current.map((item) => item.id),
        );

        return [
          ...current,
          ...result.items.filter(
            (item) => !existingIds.has(item.id),
          ),
        ];
      });

      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      if (version !== requestVersion.current) return;

      console.error("Failed to load more conversations:", err);
      setError("Không thể tải thêm hội thoại.");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [loading, hasMore, cursor, status]);

  return (
    <div className="flex h-full w-full flex-col bg-background text-sidebar-foreground">
      <div className="flex flex-col gap-3.5 border-b p-2">
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(
              value as
                | "all"
                | "unresolved"
                | "escalated"
                | "resolved",
            )
          }
        >
          <SelectTrigger className="h-8 border-none px-1.5 shadow-none ring-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-0">
            <SelectValue placeholder="Lọc hội thoại" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <ListIcon className="size-4" />
                <span>Tất cả</span>
              </div>
            </SelectItem>

            <SelectItem value="unresolved">
              <div className="flex items-center gap-2">
                <ArrowRightIcon className="size-4" />
                <span>AI đang hỗ trợ</span>
              </div>
            </SelectItem>

            <SelectItem value="escalated">
              <div className="flex items-center gap-2">
                <ArrowUpIcon className="size-4" />
                <span>Nhân viên tiếp quản</span>
              </div>
            </SelectItem>

            <SelectItem value="resolved">
              <div className="flex items-center gap-2">
                <CheckIcon className="size-4" />
                <span>Đã kết thúc</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <SkeletonConversations />
      ) : (
        <ScrollArea className="max-h-[calc(100vh-53px)]">
          <div className="flex w-full flex-col text-sm">
            {items.map((conversation) => {
              const contact = conversation.contactSession;
              const contactName =
                contact.name?.trim() || "Khách truy cập";

              const country = getCountryFromTimezone(
                contact.metadata?.timezone,
              );

              const flagUrl = country?.code
                ? getCountryFlagUrl(country.code)
                : undefined;

              const active =
                pathname ===
                `/conversations/${conversation.id}`;

              return (
                <Link
                  key={conversation.id}
                  href={`/conversations/${conversation.id}`}
                  className={cn(
                    "relative flex cursor-pointer items-start gap-3 border-b p-4 py-5 text-sm leading-tight hover:bg-accent hover:text-accent-foreground",
                    active &&
                      "bg-accent text-accent-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "absolute left-0 top-1/2 h-[64%] w-1 -translate-y-1/2 rounded-r-full bg-neutral-300 opacity-0 transition-opacity",
                      active && "opacity-100",
                    )}
                  />

                  <DicebearAvatar
                    seed={contact.id}
                    badgeImageUrl={flagUrl}
                    size={40}
                    className="shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-bold">
                        {contactName}
                      </span>

                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(
                          new Date(conversation.createdAt),
                          { addSuffix: true, locale: vi },
                        )}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {STATUS_LABELS[conversation.status]}
                      </span>

                      <ConversationStatusIcon
                        status={conversation.status}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}

            {items.length === 0 && !error && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Chưa có cuộc trò chuyện nào.
              </p>
            )}

            {error && (
              <div className="space-y-2 p-4">
                <p className="text-sm text-destructive">
                  {error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void (
                      items.length > 0
                        ? loadMore()
                        : loadFirstPage()
                    )
                  }
                >
                  Thử lại
                </Button>
              </div>
            )}

            {hasMore && !error && (
              <div className="p-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore
                    ? "Đang tải..."
                    : "Tải thêm"}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export const SkeletonConversations = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
      <div className="relative flex w-full min-w-0 flex-col p-2">
        <div className="w-full space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              className="flex items-start gap-3 rounded-lg p-4"
              key={index}
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="ml-auto h-3 w-12 shrink-0" />
                </div>

                <div className="mt-2">
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
