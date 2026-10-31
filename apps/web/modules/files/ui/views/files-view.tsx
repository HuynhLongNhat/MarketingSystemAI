
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  knowledgeApi,
  type KnowledgeEntry,
  type KnowledgeInput,
} from "@/lib/knowledge-api";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

const EMPTY_FORM: KnowledgeInput = {
  question: "",
  answer: "",
  category: "",
};

type FormErrors = {
  question?: string;
  answer?: string;
};

export const FilesView = () => {
  const [items, setItems] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeEntry | null>(
    null,
  );

  const [form, setForm] = useState<KnowledgeInput>({
    ...EMPTY_FORM,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>(
    {},
  );

  const [deleting, setDeleting] = useState<KnowledgeEntry | null>(
    null,
  );

  const loadEntries = useCallback(async (
    showLoading = false,
  ) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const result = await knowledgeApi.list();

      setItems(result);
      setLoadError(false);
      return true;
    } catch (error) {
      console.error("Failed to load knowledge:", error);
      setLoadError(true);
      toast.error("Không thể tải dữ liệu. Vui lòng thử lại.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (entry: KnowledgeEntry) => {
    setEditing(entry);
    setForm({
      question: entry.question,
      answer: entry.answer,
      category: entry.category ?? "",
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const updateField = (
    field: keyof KnowledgeInput,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === "question" || field === "answer") {
      setFormErrors((current) => ({
        ...current,
        [field]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!form.question.trim()) {
      errors.question = "Vui lòng nhập câu hỏi.";
    }

    if (!form.answer.trim()) {
      errors.answer = "Vui lòng nhập câu trả lời.";
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const saveEntry = async () => {
    if (saving || !validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const input: KnowledgeInput = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        category: form.category?.trim() ?? "",
      };

      if (editing) {
        await knowledgeApi.update(editing.id, input);
        toast.success("Đã cập nhật thành công");
      } else {
        await knowledgeApi.create(input);
        toast.success("Đã thêm thành công");
      }

      setDialogOpen(false);
      setEditing(null);
      setForm({ ...EMPTY_FORM });
      setFormErrors({});

      await loadEntries();
    } catch (error) {
      console.error("Failed to save knowledge:", error);
      toast.error("Thao tác thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async () => {
    if (!deleting || saving) {
      return;
    }

    setSaving(true);

    try {
      await knowledgeApi.remove(deleting.id);

      setDeleting(null);
      toast.success("Đã xóa thành công");

      await loadEntries();
    } catch (error) {
      console.error("Failed to delete knowledge:", error);
      toast.error("Thao tác thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted p-4 md:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold md:text-3xl">
              Knowledge Base
            </h1>

            <p className="text-sm text-muted-foreground">
              Quản lý câu hỏi và câu trả lời để đào tạo AI
              chăm sóc khách hàng.
            </p>
          </div>

          <Button onClick={openCreate}>
            <PlusIcon className="mr-2 size-4" />
            Thêm kiến thức
          </Button>
        </div>

        {loadError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-4"
          >
            <p className="text-sm text-destructive">
              Không thể cập nhật danh sách kiến thức.
            </p>

            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadEntries(true)}
            >
              Thử lại
            </Button>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5">
                  Câu hỏi
                </TableHead>

                <TableHead className="px-5">
                  Danh mục
                </TableHead>

                <TableHead className="px-5">
                  Câu trả lời
                </TableHead>

                <TableHead className="w-28 px-5">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-28 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2Icon className="size-4 animate-spin" />
                      Đang tải dữ liệu...
                    </div>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-28 text-center text-muted-foreground"
                  >
                    {loadError
                      ? "Chưa tải được dữ liệu."
                      : "Chưa có kiến thức nào."}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="max-w-64 px-5 py-4 font-medium">
                      <p className="whitespace-normal break-words">
                        {entry.question}
                      </p>
                    </TableCell>

                    <TableCell className="px-5">
                      {entry.category ? (
                        <Badge variant="outline">
                          {entry.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="max-w-80 px-5">
                      <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                        {entry.answer}
                      </p>
                    </TableCell>

                    <TableCell className="px-5">
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Sửa kiến thức"
                          onClick={() => openEdit(entry)}
                        >
                          <PencilIcon className="size-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Xóa kiến thức"
                          onClick={() => setDeleting(entry)}
                        >
                          <TrashIcon className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!loading && (
            <div className="border-t px-5 py-3 text-xs text-muted-foreground">
              Đang hiển thị {items.length} mục kiến thức
            </div>
          )}
        </div>
      </div>

      {/* CREATE / UPDATE DIALOG */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (saving) return;

          setDialogOpen(open);

          if (!open) {
            setFormErrors({});
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Chỉnh sửa kiến thức"
                : "Thêm kiến thức"}
            </DialogTitle>

            <DialogDescription>
              Quản lý thông tin để AI có thể tư vấn
              khách hàng chính xác hơn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="knowledge-question">
                Câu hỏi
              </Label>

              <Input
                id="knowledge-question"
                maxLength={500}
                value={form.question}
                aria-invalid={Boolean(formErrors.question)}
                onChange={(event) =>
                  updateField(
                    "question",
                    event.target.value,
                  )
                }
                placeholder="Ví dụ: Shop có hỗ trợ đổi trả không?"
              />

              {formErrors.question && (
                <p className="text-xs text-destructive">
                  {formErrors.question}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="knowledge-answer">
                Câu trả lời
              </Label>

              <Textarea
                id="knowledge-answer"
                rows={6}
                maxLength={10000}
                className="resize-y"
                value={form.answer}
                aria-invalid={Boolean(formErrors.answer)}
                onChange={(event) =>
                  updateField(
                    "answer",
                    event.target.value,
                  )
                }
                placeholder="Nhập câu trả lời cho khách hàng..."
              />

              {formErrors.answer && (
                <p className="text-xs text-destructive">
                  {formErrors.answer}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="knowledge-category">
                Danh mục (không bắt buộc)
              </Label>

              <Input
                id="knowledge-category"
                maxLength={100}
                value={form.category ?? ""}
                onChange={(event) =>
                  updateField(
                    "category",
                    event.target.value,
                  )
                }
                placeholder="Ví dụ: Chính sách"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setDialogOpen(false)}
            >
              Hủy
            </Button>

            <Button
              disabled={saving}
              onClick={() => void saveEntry()}
            >
              {saving && (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              )}

              {saving
                ? "Đang lưu..."
                : editing
                  ? "Cập nhật"
                  : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setDeleting(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Xóa kiến thức?
            </DialogTitle>

            <DialogDescription>
              Bạn có chắc muốn xóa mục này?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

          {deleting && (
            <p className="rounded-md bg-muted p-3 text-sm font-medium">
              {deleting.question}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setDeleting(null)}
            >
              Hủy
            </Button>

            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => void deleteEntry()}
            >
              {saving && (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              )}

              {saving ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
