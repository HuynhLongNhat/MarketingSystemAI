
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import {
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";

import {
  aiProvidersApi,
  AI_MODEL_PURPOSES,
  type AiModelPurpose,
  type AiProviderConnection,
  type AiModelDefault,
  type AiProviderType,
} from "@/lib/ai-providers-api";
import { authClient } from "@/lib/auth-client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

const PROVIDERS: AiProviderType[] = [
  "openai",
  "anthropic",
  "openrouter",
];

const PURPOSE_LABELS: Record<AiModelPurpose, string> = {
  customer_support: "Chăm sóc khách hàng",
  message_enhancement: "Cải thiện tin nhắn",
  general: "Tác vụ chung",
};

const emptyDefaults: Record<AiModelPurpose, {
  connectionId: string;
  modelId: string;
}> = {
  customer_support: { connectionId: "", modelId: "" },
  message_enhancement: { connectionId: "", modelId: "" },
  general: { connectionId: "", modelId: "" },
};

export function AiProvidersView() {
  const { data: organization } =
    authClient.useActiveOrganization();

  const organizationId = organization?.id;

  const [connections, setConnections] =
    useState<AiProviderConnection[]>([]);
  const [defaults, setDefaults] =
    useState<AiModelDefault[]>([]);
  const [drafts, setDrafts] = useState(emptyDefaults);

  const [provider, setProvider] =
    useState<AiProviderType>("openrouter");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!organizationId) {
      setConnections([]);
      setDefaults([]);
      setDrafts(emptyDefaults);
      return;
    }

    setLoading(true);

    try {
      const [connectionData, defaultData] =
        await Promise.all([
          aiProvidersApi.listConnections(),
          aiProvidersApi.listModelDefaults(),
        ]);

      setConnections(connectionData);
      setDefaults(defaultData);

      const next = {
        customer_support: { connectionId: "", modelId: "" },
        message_enhancement: { connectionId: "", modelId: "" },
        general: { connectionId: "", modelId: "" },
      };

      for (const item of defaultData) {
        if (item.purpose in next) {
          next[item.purpose as AiModelPurpose] = {
            connectionId: item.connectionId,
            modelId: item.modelId,
          };
        }
      }

      setDrafts(next);
    } catch {
      toast.error("Không tải được cấu hình AI Providers.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function createConnection(event: FormEvent) {
    event.preventDefault();

    if (!organizationId) {
      toast.error("Vui lòng chọn tổ chức.");
      return;
    }

    if (!name.trim() || !apiKey.trim()) {
      toast.error("Nhập tên và API key.");
      return;
    }

    setSaving(true);

    try {
      await aiProvidersApi.createConnection({
        provider,
        name: name.trim(),
        apiKey: apiKey.trim(),
      });

      setName("");
      setApiKey("");
      toast.success("Đã tạo AI connection.");
      await loadData();
    } catch {
      toast.error("Không thể tạo connection.");
    } finally {
      setSaving(false);
    }
  }

  async function updateConnection(
    id: string,
    input: {
      enabled?: boolean;
      apiKey?: string;
    },
  ) {
    setBusyId(id);

    try {
      await aiProvidersApi.updateConnection(id, input);
      toast.success("Đã cập nhật connection.");
      await loadData();
    } catch {
      toast.error("Không thể cập nhật connection.");
    } finally {
      setBusyId(null);
    }
  }

  async function replaceKey(id: string) {
    const newKey = window.prompt("Nhập API key mới:");

    if (newKey === null) return;

    if (!newKey.trim()) {
      toast.error("API key không được để trống.");
      return;
    }

    await updateConnection(id, { apiKey: newKey.trim() });
  }

  async function removeConnection(id: string) {
    if (!window.confirm("Xóa AI connection này?")) return;

    setBusyId(id);

    try {
      await aiProvidersApi.deleteConnection(id);
      toast.success("Đã xóa connection.");
      await loadData();
    } catch {
      toast.error(
        "Không thể xóa. Kiểm tra model defaults đang sử dụng connection.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function saveDefault(purpose: AiModelPurpose) {
    const draft = drafts[purpose];

    if (!draft.connectionId || !draft.modelId.trim()) {
      toast.error("Chọn connection và nhập model ID.");
      return;
    }

    setBusyId(purpose);

    try {
      await aiProvidersApi.setModelDefault(purpose, {
        connectionId: draft.connectionId,
        modelId: draft.modelId.trim(),
      });

      toast.success("Đã lưu model mặc định.");
      await loadData();
    } catch {
      toast.error("Không thể lưu model mặc định.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeDefault(purpose: AiModelPurpose) {
    setBusyId(purpose);

    try {
      await aiProvidersApi.deleteModelDefault(purpose);
      toast.success("Đã xóa model mặc định.");
      await loadData();
    } catch {
      toast.error("Không thể xóa model mặc định.");
    } finally {
      setBusyId(null);
    }
  }

  const enabledConnections =
    connections.filter((item) => item.enabled);

  return (
    <div className="min-h-screen bg-muted p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              AI Providers & Models
            </h1>
            <p className="text-sm text-muted-foreground">
              Quản lý API keys và model theo tổ chức.
            </p>
          </div>

          <Button
            variant="outline"
            disabled={loading || !organizationId}
            onClick={() => void loadData()}
          >
            <RefreshCwIcon className="mr-2 size-4" />
            Làm mới
          </Button>
        </div>

        {!organizationId && (
          <p className="rounded-lg border bg-background p-4">
            Vui lòng chọn tổ chức trước khi cấu hình.
          </p>
        )}

        <section className="space-y-4 rounded-xl border bg-background p-5">
          <h2 className="text-lg font-semibold">
            Thêm AI Provider
          </h2>

          <form
            onSubmit={(event) => void createConnection(event)}
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <select
                id="provider"
                value={provider}
                onChange={(event) =>
                  setProvider(event.target.value as AiProviderType)
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {PROVIDERS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="connection-name">
                Tên connection
              </Label>
              <Input
                id="connection-name"
                maxLength={100}
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Main OpenRouter"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                autoComplete="off"
                maxLength={4096}
                value={apiKey}
                onChange={(event) =>
                  setApiKey(event.target.value)
                }
                placeholder="Nhập API key"
                required
              />
              <p className="text-xs text-muted-foreground">
                Key được gửi đến backend để mã hóa.
                Không hiển thị lại key sau khi lưu.
              </p>
            </div>

            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={saving || !organizationId}
              >
                {saving ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                ) : (
                  <PlusIcon className="mr-2 size-4" />
                )}
                Thêm connection
              </Button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Danh sách connections ({connections.length})
          </h2>

          {loading && (
            <p className="text-sm text-muted-foreground">
              Đang tải...
            </p>
          )}

          {!loading && connections.length === 0 && (
            <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">
              Chưa có AI connection nào.
            </div>
          )}

          {connections.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-background p-5"
            >
              <div className="space-y-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.provider} ·{" "}
                  {item.hasApiKey
                    ? "API key đã lưu"
                    : "Chưa có API key"}
                </p>
                <p className="text-xs">
                  {item.enabled ? "Đang bật" : "Đã tắt"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === item.id}
                  onClick={() =>
                    void updateConnection(item.id, {
                      enabled: !item.enabled,
                    })
                  }
                >
                  {item.enabled ? "Tắt" : "Bật"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === item.id}
                  onClick={() => void replaceKey(item.id)}
                >
                  Đổi key
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busyId === item.id}
                  onClick={() =>
                    void removeConnection(item.id)
                  }
                >
                  <Trash2Icon className="mr-1 size-4" />
                  Xóa
                </Button>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Model Defaults
          </h2>

          <p className="text-sm text-muted-foreground">
            Chọn connection và model cho từng mục đích.
          </p>

          {AI_MODEL_PURPOSES.map((purpose) => {
            const draft = drafts[purpose];
            const saved = defaults.some(
              (item) => item.purpose === purpose,
            );

            return (
              <div
                key={purpose}
                className="space-y-4 rounded-xl border bg-background p-5"
              >
                <h3 className="font-semibold">
                  {PURPOSE_LABELS[purpose]}
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Connection</Label>
                    <select
                      value={draft.connectionId}
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [purpose]: {
                            ...previous[purpose],
                            connectionId: event.target.value,
                          },
                        }))
                      }
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">
                        Chọn connection
                      </option>
                      {connections
                        .filter(
                          (item) =>
                            item.enabled ||
                            item.id === draft.connectionId,
                        )
                        .map((item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.name} ({item.provider})
                            {!item.enabled ? " - đã tắt" : ""}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Model ID</Label>
                    <Input
                      maxLength={200}
                      value={draft.modelId}
                      placeholder="Ví dụ: openai/gpt-4o-mini"
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [purpose]: {
                            ...previous[purpose],
                            modelId: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={
                      busyId === purpose ||
                      !organizationId ||
                      !enabledConnections.some(
                        (item) =>
                          item.id === draft.connectionId,
                      )
                    }
                    onClick={() =>
                      void saveDefault(purpose)
                    }
                  >
                    Lưu model
                  </Button>

                  {saved && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === purpose}
                      onClick={() =>
                        void removeDefault(purpose)
                      }
                    >
                      Bỏ mặc định
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
