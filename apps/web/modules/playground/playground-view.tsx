"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FlaskConical, Loader2, MessageSquarePlus, RefreshCw } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { ApiError } from "@/lib/api-client";
import {
  playgroundApi,
  type PlaygroundOverview,
} from "@/lib/playground-api";

import { PlaygroundChat } from "./playground-chat";
import { issueMessages, PlaygroundSidebar } from "./playground-sidebar";
import { usePlaygroundChat } from "./use-playground-chat";

const primary =
  "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";

function loadErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "Bạn không có quyền sử dụng Playground. Chỉ quản trị viên hoặc chủ sở hữu mới được thử nghiệm chatbot.";
  }

  return "Không thể tải cấu hình chatbot. Vui lòng thử lại.";
}

export function PlaygroundView() {
  const chat = usePlaygroundChat();

  const [overview, setOverview] = useState<PlaygroundOverview | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await playgroundApi.getOverview();

      setOverview(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(loadErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      toast.success("Đã cập nhật cấu hình.");
    } finally {
      setRefreshing(false);
    }
  }

  function requestReset() {
    if (chat.messages.length === 0) return;

    setConfirmReset(true);
  }

  function doReset() {
    chat.reset();
    setConfirmReset(false);
  }

  const blockingIssue = overview?.issues.find(
    (issue) => issueMessages[issue].blocking,
  );

  const blockedReason = blockingIssue
    ? issueMessages[blockingIssue].title
    : null;

  return (
    <div className="w-full min-w-0 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-lg border p-3">
            <FlaskConical className="size-5" />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              Thử nghiệm Chatbot
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Trò chuyện thử với nhân viên CSKH bằng đúng cấu hình
              đang chạy trên website.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={refreshing || loading}
            onClick={() => void refresh()}
          >
            <RefreshCw
              className={`size-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Làm mới cấu hình
          </Button>

          <Button
            type="button"
            className={primary}
            disabled={chat.messages.length === 0}
            onClick={requestReset}
          >
            <MessageSquarePlus className="size-4" />
            Cuộc thử mới
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>

          <Skeleton className="h-[480px] w-full" />
        </div>
      ) : loadError || !overview ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border p-12 text-center">
          <p className="max-w-md text-sm text-muted-foreground">
            {loadError ?? "Không có dữ liệu cấu hình."}
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Thử lại
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="order-2 min-w-0 lg:order-1">
            <PlaygroundSidebar
              overview={overview}
              messageCount={chat.messages.filter(
                (item) => item.kind === "message",
              ).length}
              lastLatencyMs={chat.lastLatencyMs}
            />
          </aside>

          <section className="order-1 min-w-0 lg:order-2">
            <PlaygroundChat
              messages={chat.messages}
              sending={chat.sending}
              blockedReason={blockedReason}
              onSend={chat.send}
              onRetry={chat.retry}
            />
          </section>
        </div>
      )}

      <AlertDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bắt đầu cuộc thử mới?</AlertDialogTitle>

            <AlertDialogDescription>
              Nội dung cuộc thử hiện tại sẽ bị xóa khỏi màn hình và
              không thể khôi phục.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>

            <AlertDialogAction
              className={primary}
              onClick={doReset}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}