
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { Loader2 } from "lucide-react";

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

import { workforceApi } from "@/lib/workforce-api";
import { crudToast } from "@/lib/crud-messages";
import { useUiLanguage } from "@/lib/ui-language";

interface CreateDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
}

function makeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100)
    .replace(/-$/g, "");
}

export function CreateDepartmentDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateDepartmentDialogProps) {
  const { language } = useUiLanguage();
  const isVi = language === "vi";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
    }
  }, [open]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) return;

    const normalizedName = name.trim();
    const slug = makeSlug(normalizedName);

    if (!normalizedName || !slug) return;

    setSaving(true);

    try {
      await workforceApi.createDepartment({
        name: normalizedName,
        slug,
        description: description.trim(),
      });

      crudToast.success("create", "department", {
        language,
      });

      onOpenChange(false);
      await onCreated();
    } catch (error) {
      crudToast.error("create", "department", {
        language,
        description:
          error instanceof Error
            ? error.message
            : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b px-6 py-5 text-left">
          <DialogTitle>
            {isVi
              ? "Tạo phòng ban"
              : "Create department"}
          </DialogTitle>

          <DialogDescription>
            {isVi
              ? "Thêm phòng ban mới để tổ chức và quản lý đội ngũ nhân viên AI."
              : "Create a department to organize your AI workforce."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) =>
            void handleSubmit(event)
          }
          className="flex min-h-0 flex-col"
        >
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <label
                htmlFor="create-department-name"
                className="text-sm font-medium"
              >
                {isVi
                  ? "Tên phòng ban"
                  : "Department name"}{" "}
                <span className="text-destructive">*</span>
              </label>

              <Input
                id="create-department-name"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder={
                  isVi
                    ? "Ví dụ: Chăm sóc khách hàng"
                    : "Example: Customer Support"
                }
                maxLength={120}
                required
                disabled={saving}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="create-department-description"
                className="text-sm font-medium"
              >
                {isVi ? "Mô tả" : "Description"}
              </label>

              <Textarea
                id="create-department-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder={
                  isVi
                    ? "Mô tả chức năng và nhiệm vụ của phòng ban..."
                    : "Describe the department's responsibilities..."
                }
                rows={5}
                maxLength={2000}
                disabled={saving}
                className="min-h-28 resize-y"
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              {isVi ? "Hủy" : "Cancel"}
            </Button>

            <Button
              type="submit"
              disabled={saving || !makeSlug(name.trim())}
            >
              {saving && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {isVi
                ? "Tạo phòng ban"
                : "Create department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
