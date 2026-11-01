
"use client";

import {
  useState,
  type FormEvent,
} from "react";
import {
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import {
  type Department,
  type UpdateDepartmentInput,
} from "@/lib/workforce-api";
import { useUiLanguage } from "@/lib/ui-language";

interface DepartmentCardProps {
  department: Department;
  employeeCount: number;
  busy?: boolean;
  onUpdate: (
    id: string,
    input: UpdateDepartmentInput,
  ) => Promise<void>;
  onDelete: (department: Department) => void;
}

export function DepartmentCard({
  department,
  employeeCount,
  busy = false,
  onUpdate,
  onDelete,
}: DepartmentCardProps) {
  const { language } = useUiLanguage();

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(department.name);
  const [description, setDescription] = useState(
    department.description ?? "",
  );

  const isVietnamese = language === "vi";
  const hasEmployees = employeeCount > 0;
  const isBusy = busy || saving;

  function openEditDialog() {
    setName(department.name);
    setDescription(department.description ?? "");
    setEditOpen(true);
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isBusy) return;

    const normalizedName = name.trim();

    if (!normalizedName) return;

    const changes: UpdateDepartmentInput = {
      name: normalizedName,
      description: description.trim(),
    };

    const unchanged =
      changes.name === department.name &&
      changes.description ===
        (department.description ?? "");

    if (unchanged) {
      setEditOpen(false);
      return;
    }

    setSaving(true);

    try {
      await onUpdate(department.id, changes);
      setEditOpen(false);
    } catch {
      // The parent displays the shared CRUD error toast.
      // Keep the dialog open so the user can retry.
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex h-full min-w-0 flex-col rounded-lg border p-5 transition-colors hover:bg-muted/20">
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium">
            {department.name}
          </p>

          <p className="mt-1 break-all text-xs text-muted-foreground">
            {department.slug}
          </p>

          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {department.description ||
              (isVietnamese
                ? "Chưa có mô tả"
                : "No description")}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {employeeCount}{" "}
            {isVietnamese ? "nhân viên" : "agents"}
          </p>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="edit"
              size="icon"
              disabled={isBusy}
              aria-label={
                isVietnamese
                  ? `Sửa ${department.name}`
                  : `Edit ${department.name}`
              }
              title={
                isVietnamese
                  ? "Sửa phòng ban"
                  : "Edit department"
              }
              onClick={openEditDialog}
            >
              <Pencil className="size-4" />
            </Button>

            <Button
              type="button"
              variant="delete"
              size="icon"
              disabled={isBusy || hasEmployees}
              aria-label={
                isVietnamese
                  ? `Xóa ${department.name}`
                  : `Delete ${department.name}`
              }
              title={
                hasEmployees
                  ? isVietnamese
                    ? "Cần chuyển hết nhân viên sang phòng ban khác trước khi xóa."
                    : "Move all agents to another department before deleting."
                  : isVietnamese
                    ? "Xóa phòng ban"
                    : "Delete department"
              }
              onClick={() => onDelete(department)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(nextOpen) => {
          if (!saving) setEditOpen(nextOpen);
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isVietnamese
                ? "Chỉnh sửa phòng ban"
                : "Edit department"}
            </DialogTitle>

            <DialogDescription>
              {isVietnamese
                ? "Cập nhật tên và mô tả phòng ban."
                : "Update the department name and description."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(event) =>
              void handleUpdate(event)
            }
            className="space-y-5"
          >
            <div className="space-y-2">
              <label
                htmlFor={`department-name-${department.id}`}
                className="text-sm font-medium"
              >
                {isVietnamese
                  ? "Tên phòng ban"
                  : "Department name"}{" "}
                *
              </label>

              <Input
                id={`department-name-${department.id}`}
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                maxLength={120}
                required
                disabled={saving}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`department-description-${department.id}`}
                className="text-sm font-medium"
              >
                {isVietnamese
                  ? "Mô tả"
                  : "Description"}
              </label>

              <Textarea
                id={`department-description-${department.id}`}
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                maxLength={2000}
                rows={4}
                disabled={saving}
                placeholder={
                  isVietnamese
                    ? "Mô tả chức năng, nhiệm vụ của phòng ban..."
                    : "Describe the department's responsibilities..."
                }
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {isVietnamese
                ? `Mã phòng ban: ${department.slug} (không thay đổi khi sửa tên)`
                : `Department slug: ${department.slug} (unchanged when renaming)`}
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setEditOpen(false)}
              >
                {isVietnamese ? "Hủy" : "Cancel"}
              </Button>

              <Button
                type="submit"
                disabled={isBusy || !name.trim()}
              >
                {saving && (
                  <Loader2 className="size-4 animate-spin" />
                )}

                {isVietnamese
                  ? "Lưu thay đổi"
                  : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
