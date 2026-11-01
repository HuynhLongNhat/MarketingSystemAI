
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import {
  workforceApi,
  type AgentCategory,
  type AgentTemplate,
  type CreateAgentTemplateInput,
} from "@/lib/workforce-api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: AgentTemplate | null;
  onSaved: () => Promise<void>;
}

type TemplateForm = {
  name: string;
  slug: string;
  category: AgentCategory;
  description: string;
  systemPrompt: string;
  version: string;
  isPublished: boolean;
};

const EMPTY_FORM: TemplateForm = {
  name: "",
  slug: "",
  category: "other",
  description: "",
  systemPrompt: "",
  version: "1.0.0",
  isPublished: false,
};

const CATEGORY_LABELS: Record<AgentCategory, string> = {
  marketing: "Marketing",
  sales: "Kinh doanh",
  support: "Chăm sóc khách hàng",
  research: "Nghiên cứu",
  operations: "Vận hành",
  other: "Khác",
};

const CATEGORIES = Object.keys(
  CATEGORY_LABELS,
) as AgentCategory[];

const primaryClass =
  "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";

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

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSaved,
}: Props) {
  const [form, setForm] = useState<TemplateForm>({
    ...EMPTY_FORM,
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setForm(
      template
        ? {
            name: template.name,
            slug: template.slug,
            category: template.category,
            description: template.description ?? "",
            systemPrompt: template.systemPrompt,
            version: template.version,
            isPublished: template.isPublished,
          }
        : { ...EMPTY_FORM },
    );

    setSlugEdited(Boolean(template));
  }, [open, template]);

  const update = <K extends keyof TemplateForm>(
    field: K,
    value: TemplateForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  function changeName(name: string) {
    setForm((current) => ({
      ...current,
      name,
      slug: slugEdited ? current.slug : makeSlug(name),
    }));
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const input: CreateAgentTemplateInput = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      category: form.category,
      description: form.description.trim(),
      systemPrompt: form.systemPrompt.trim(),
      version: form.version.trim(),
      isPublished: form.isPublished,
    };

    if (!input.name || !input.systemPrompt || !input.version) {
      toast.error("Vui lòng điền các trường bắt buộc.");
      return;
    }

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)
    ) {
      toast.error(
        "Mã mẫu chỉ được chứa chữ thường, số và dấu gạch ngang.",
      );
      return;
    }

    if (input.slug.length > 100) {
      toast.error("Mã mẫu tối đa 100 ký tự.");
      return;
    }

    setSaving(true);

    try {
      if (template) {
        await workforceApi.updateTemplate(
          template.id,
          input,
        );
        toast.success("Đã cập nhật mẫu nhân viên AI.");
      } else {
        await workforceApi.createTemplate(input);
        toast.success("Đã tạo mẫu nhân viên AI.");
      }

      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error("Không thể lưu mẫu nhân viên.", {
        description:
          error instanceof Error
            ? error.message
            : "Vui lòng thử lại.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!saving) onOpenChange(value);
      }}
    >
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-5 text-left">
          <DialogTitle>
            {template
              ? "Chỉnh sửa mẫu nhân viên"
              : "Tạo mẫu nhân viên AI"}
          </DialogTitle>
          <DialogDescription>
            Thiết lập chuyên môn, nhiệm vụ và hướng dẫn
            để tạo nhân viên AI từ mẫu.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => void submit(event)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="grid min-h-0 grid-cols-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span>Tên mẫu *</span>
              <Input
                required
                maxLength={120}
                placeholder="Ví dụ: Chuyên viên nội dung"
                value={form.name}
                onChange={(event) =>
                  changeName(event.target.value)
                }
              />
            </label>

            <label className="space-y-2 text-sm">
              <span>Mã mẫu (slug) *</span>
              <Input
                required
                maxLength={100}
                placeholder="chuyen-vien-noi-dung"
                value={form.slug}
                onChange={(event) => {
                  update("slug", event.target.value);
                  setSlugEdited(true);
                }}
              />
              <span className="block text-xs text-muted-foreground">
                Khi tạo Agent, mã này sẽ xác định vai trò.
              </span>
            </label>

            <div className="space-y-2 text-sm">
              <span>Chuyên môn</span>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  update(
                    "category",
                    value as AgentCategory,
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem
                      key={category}
                      value={category}
                    >
                      {CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="space-y-2 text-sm">
              <span>Phiên bản *</span>
              <Input
                required
                maxLength={50}
                placeholder="1.0.0"
                value={form.version}
                onChange={(event) =>
                  update("version", event.target.value)
                }
              />
            </label>

            <label className="space-y-2 text-sm sm:col-span-2">
              <span>Mô tả nhiệm vụ</span>
              <Textarea
                rows={3}
                maxLength={2000}
                placeholder="Mẫu nhân viên này phụ trách những công việc gì?"
                value={form.description}
                onChange={(event) =>
                  update("description", event.target.value)
                }
              />
            </label>

            <label className="space-y-2 text-sm sm:col-span-2">
              <span>System Prompt *</span>
              <Textarea
                required
                rows={9}
                maxLength={20000}
                placeholder="Mô tả chuyên môn, mục tiêu, giới hạn trách nhiệm, quy trình và định dạng đầu ra..."
                value={form.systemPrompt}
                onChange={(event) =>
                  update(
                    "systemPrompt",
                    event.target.value,
                  )
                }
                className="font-mono text-sm"
              />
              <span className="block text-xs text-muted-foreground">
                Prompt do bạn định nghĩa, không tự sao chép
                prompt từ dịch vụ AI khác.
              </span>
            </label>

            <div className="flex items-start gap-3 rounded-lg border p-4 sm:col-span-2">
              <Checkbox
                id="template-published"
                checked={form.isPublished}
                onCheckedChange={(checked) =>
                  update(
                    "isPublished",
                    checked === true,
                  )
                }
              />

              <div className="space-y-1">
                <label
                  htmlFor="template-published"
                  className="cursor-pointer text-sm font-medium"
                >
                  Đánh dấu đã xuất bản
                </label>
                <p className="text-xs text-muted-foreground">
                  Trạng thái này không tự động chia sẻ
                  mẫu sang tổ chức khác. Phạm vi sử dụng
                  vẫn do backend kiểm soát.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>

            <Button
              type="submit"
              disabled={saving}
              className={primaryClass}
            >
              {saving && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {template ? "Lưu thay đổi" : "Tạo mẫu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
