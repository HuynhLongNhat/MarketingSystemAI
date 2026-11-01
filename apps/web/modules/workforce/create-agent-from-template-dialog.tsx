
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
  aiProvidersApi,
  type AiProviderConnection,
} from "@/lib/ai-providers-api";
import {
  workforceApi,
  type AgentTemplate,
  type Department,
  type CreateAgentFromTemplateInput,
} from "@/lib/workforce-api";
import { ModelPicker } from "./model-picker";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: AgentTemplate | null;
  departments: Department[];
  onCreated: () => Promise<void>;
}

export function CreateAgentFromTemplateDialog({
  open,
  onOpenChange,
  template,
  departments,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const [modelId, setModelId] = useState("");

  const [connections, setConnections] = useState<
    AiProviderConnection[]
  >([]);
  const [loadingConnections, setLoadingConnections] =
    useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !template) return;

    setName(template.name);
    setDepartmentId("");
    setConnectionId("");
    setModelId("");

    let active = true;
    setLoadingConnections(true);

    void aiProvidersApi
      .listConnections()
      .then((data) => {
        if (active) setConnections(data);
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error("Không thể tải kết nối AI.", {
            description:
              error instanceof Error
                ? error.message
                : undefined,
          });
        }
      })
      .finally(() => {
        if (active) setLoadingConnections(false);
      });

    return () => {
      active = false;
    };
  }, [open, template]);

  const selectedConnection = connections.find(
    (item) => item.id === connectionId,
  );

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!template) return;

    if (!name.trim()) {
      toast.error("Vui lòng nhập tên nhân viên.");
      return;
    }

    if (modelId && !connectionId) {
      toast.error("Vui lòng chọn kết nối AI trước.");
      return;
    }

    const input: CreateAgentFromTemplateInput = {
      name: name.trim(),
      ...(departmentId ? { departmentId } : {}),
      ...(connectionId ? { connectionId } : {}),
      ...(modelId ? { modelId } : {}),
      enabledTools: [],
    };

    setSaving(true);

    try {
      await workforceApi.createAgentFromTemplate(
        template.id,
        input,
      );

      toast.success("Đã tạo nhân viên AI từ mẫu.", {
        description: name.trim(),
      });

      onOpenChange(false);
      await onCreated();
    } catch (error) {
      toast.error("Không thể tạo nhân viên AI.", {
        description:
          error instanceof Error
            ? error.message
            : "Vui lòng thử lại.",
      });
    } finally {
      setSaving(false);
    }
  }

  const primaryClass =
    "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!saving) onOpenChange(value);
      }}
    >
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b px-6 py-5 text-left">
          <DialogTitle>
            Tạo nhân viên từ mẫu
          </DialogTitle>
          <DialogDescription>
            {template
              ? `Mẫu: ${template.name}`
              : "Chọn mẫu nhân viên."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => void submit(event)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="grid min-h-0 grid-cols-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm sm:col-span-2">
              <span>Tên nhân viên *</span>
              <Input
                required
                maxLength={120}
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
              />
            </label>

            <div className="space-y-2 text-sm sm:col-span-2">
              <span>Phòng ban</span>
              <Select
                value={departmentId || "none"}
                onValueChange={(value) =>
                  setDepartmentId(
                    value === "none" ? "" : value,
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Chưa phân phòng
                  </SelectItem>

                  {departments.map((department) => (
                    <SelectItem
                      key={department.id}
                      value={department.id}
                    >
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-sm">
              <span>Kết nối AI</span>
              <Select
                disabled={loadingConnections}
                value={connectionId || "none"}
                onValueChange={(value) => {
                  setConnectionId(
                    value === "none" ? "" : value,
                  );
                  setModelId("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder="Chọn kết nối AI"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Chưa chọn kết nối
                  </SelectItem>

                  {connections
                    .filter((item) => item.enabled)
                    .map((connection) => (
                      <SelectItem
                        key={connection.id}
                        value={connection.id}
                      >
                        {connection.name} (
                        {connection.provider})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {loadingConnections && (
                <p className="text-xs text-muted-foreground">
                  Đang tải kết nối AI...
                </p>
              )}
            </div>

            <div className="min-w-0 space-y-2 text-sm">
              <span>Mô hình AI</span>
              <ModelPicker
                provider={selectedConnection?.provider}
                value={modelId}
                onChange={setModelId}
                disabled={saving}
              />
            </div>

            <p className="text-xs text-muted-foreground sm:col-span-2">
              Vai trò và System Prompt được lấy từ mẫu.
              Bạn có thể chỉnh sửa nhân viên sau khi tạo.
            </p>
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
              disabled={saving || !template}
              className={primaryClass}
            >
              {saving && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Tạo nhân viên
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
