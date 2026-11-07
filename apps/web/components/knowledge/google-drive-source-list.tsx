"use client";

import type { MouseEvent } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";

import type { GoogleDriveSource } from "@/lib/knowledge-connections-api";
import {
  getKnowledgeSourceStage,
  KnowledgeSourceStatus,
} from "./knowledge-source-status";

import { Button } from "@workspace/ui/components/button";
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

function formatDate(value: string | null) {
  if (!value) return "Chưa index";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function GoogleDriveSourceList({
  sources,
  removingId,
  onRemove,
  onRetry,
  retryingId,
}: {
  sources: GoogleDriveSource[];
  removingId: string | null;
  retryingId: string | null;
  onRemove: (source: GoogleDriveSource) => void;
  onRetry: (source: GoogleDriveSource) => void;
}) {
  if (sources.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Chưa có tài liệu Google Drive trong Knowledge Base.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sources.map((source) => {
        const stage = getKnowledgeSourceStage(source);
        const isRemoving = removingId === source.id;
        const isRetrying = retryingId === source.id;

        return (
          <article
            key={source.id}
            className="rounded-lg border bg-background p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium">{source.name}</p>
                <p className="text-xs text-muted-foreground">
                  {source.chunkCount} chunks · {source.embeddingCount} embeddings
                  {source.embeddingModel
                    ? ` · ${source.embeddingModel}`
                    : source.embeddingProvider
                      ? ` · ${source.embeddingProvider}`
                      : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Lần index gần nhất: {formatDate(source.lastIndexedAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <KnowledgeSourceStatus source={source} />

                {(stage === "failed" || stage === "indexing" || stage === "ready") && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isRetrying || isRemoving}
                    onClick={() => onRetry(source)}
                  >
                    {isRetrying ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    {stage === "ready" ? "Re-index" : "Thử lại"}
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isRemoving || isRetrying}
                  onClick={() => onRemove(source)}
                >
                  {isRemoving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4 text-destructive" />
                  )}
                  Remove source
                </Button>
              </div>
            </div>

            {stage === "embedding" && (
              <p className="mt-3 text-xs text-muted-foreground">
                Đã trích xuất nội dung; đang chờ embedding để có thể tìm kiếm ngữ nghĩa.
              </p>
            )}

            {stage === "failed" && source.errorMessage && (
              <p role="alert" className="mt-3 text-xs text-destructive">
                {source.errorMessage}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function RemoveGoogleDriveSourceDialog({
  source,
  pending,
  onOpenChange,
  onConfirm,
}: {
  source: GoogleDriveSource | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <AlertDialog open={Boolean(source)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove source khỏi Knowledge Base?</AlertDialogTitle>
          <AlertDialogDescription>
            {source
              ? `Tài liệu “${source.name}”, các chunks và embeddings liên quan sẽ bị xóa khỏi Knowledge Base. File gốc trên Google Drive không bị xóa.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {pending ? "Đang xóa..." : "Remove source"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
