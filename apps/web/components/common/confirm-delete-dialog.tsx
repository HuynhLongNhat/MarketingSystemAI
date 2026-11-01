
"use client";

import { Loader2, Trash2, X } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";

import { useUiLanguage } from "@/lib/ui-language";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;

  /**
   * Name of the item being deleted.
   *
   * Example:
   * itemName="Customer Support Specialist"
   *
   * Generated title:
   * "Xóa Customer Support Specialist?"
   */
  itemName?: string | null;

  /**
   * Optional overrides for existing callers.
   */
  title?: string;
  description?: string;

  loading?: boolean;
  cancelLabel?: string;
  confirmLabel?: string;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  title,
  description,
  loading = false,
  cancelLabel,
  confirmLabel,
}: ConfirmDeleteDialogProps) {
  const { language } = useUiLanguage();

  const isVietnamese = language === "vi";
  const normalizedItemName = itemName?.trim();

  const defaultTitle = normalizedItemName
    ? isVietnamese
      ? `Xóa ${normalizedItemName}?`
      : `Delete ${normalizedItemName}?`
    : isVietnamese
      ? "Xác nhận xóa"
      : "Confirm deletion";

  const defaultDescription = isVietnamese
    ? "Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác."
    : "Are you sure you want to delete this item? This action cannot be undone.";

  const resolvedTitle = title ?? defaultTitle;
  const resolvedDescription =
    description ?? defaultDescription;

  const resolvedCancelLabel =
    cancelLabel ?? (isVietnamese ? "Hủy" : "Cancel");

  const resolvedConfirmLabel =
    confirmLabel ?? (isVietnamese ? "Xóa" : "Delete");

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!loading) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {resolvedTitle}
          </AlertDialogTitle>

          <AlertDialogDescription>
            {resolvedDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
            {resolvedCancelLabel}
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}

            {resolvedConfirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
