
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  aiProvidersApi,
  AI_MODEL_PURPOSES,
  type AiModelPurpose,
  type AiProviderConnection,
  type AiModelDefault,
  type AiProviderType,
  type CatalogProvider,
  type ConnectionTestResult,
} from "@/lib/ai-providers-api";
import { authClient } from "@/lib/auth-client";
import { ModelPicker } from "@/modules/workforce/model-picker";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
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

type ModelDraft = {
  connectionId: string;
  modelId: string;
};

const PURPOSE_LABELS: Record<AiModelPurpose, string> = {
  customer_support: "Chăm sóc khách hàng",
  message_enhancement: "Cải thiện tin nhắn",
  general: "Tác vụ chung",
  embedding: "Embedding Knowledge Base",
};

const PURPOSE_DESCRIPTIONS: Record<AiModelPurpose, string> = {
  customer_support:
    "Model mặc định để chatbot CSKH trả lời khách hàng trên website.",
  message_enhancement:
    "Model dành cho chức năng hỗ trợ cải thiện nội dung tin nhắn.",
  general:
    "Model dự phòng cho các chức năng AI dùng chung trong tương lai.",
  embedding:
    "Tạo vector cho tài liệu Knowledge Base. Chỉ hiển thị model tương thích pgvector 1536 dimensions.",
};

const PRIMARY_CLASS =
  "bg-zinc-950 text-white hover:bg-zinc-800 " +
  "dark:bg-white dark:text-black dark:hover:bg-zinc-200";

const CHAT_MODEL_PURPOSES: readonly AiModelPurpose[] = [
  "customer_support",
  "message_enhancement",
  "general",
];

function emptyDrafts(): Record<AiModelPurpose, ModelDraft> {
  return {
    customer_support: {
      connectionId: "",
      modelId: "",
    },
    message_enhancement: {
      connectionId: "",
      modelId: "",
    },
    general: {
      connectionId: "",
      modelId: "",
    },
    embedding: {
      connectionId: "",
      modelId: "",
    },
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Vui lòng thử lại.";
}

interface ModelDefaultCardProps {
  purpose: AiModelPurpose;
  draft: ModelDraft;
  saved: AiModelDefault | undefined;
  connections: AiProviderConnection[];
  busy: boolean;
  disabled: boolean;
  onChange: (
    purpose: AiModelPurpose,
    changes: Partial<ModelDraft>,
  ) => void;
  onSave: (purpose: AiModelPurpose) => Promise<void>;
  onRemove: (purpose: AiModelPurpose) => Promise<void>;
}

function ModelDefaultCard({
  purpose,
  draft,
  saved,
  connections,
  busy,
  disabled,
  onChange,
  onSave,
  onRemove,
}: ModelDefaultCardProps) {
  const selectedConnection = connections.find(
    (connection) => connection.id === draft.connectionId,
  );

  const availableConnections = connections.filter(
    (connection) =>
      (purpose !== "embedding" ||
        connection.provider === "openai" ||
        connection.provider === "openrouter") &&
      (connection.enabled || connection.id === draft.connectionId),
  );

  const savedMatchesDraft =
    saved?.connectionId === draft.connectionId &&
    saved?.modelId === draft.modelId;

  const canSave =
    !disabled &&
    !busy &&
    Boolean(selectedConnection?.enabled) &&
    Boolean(draft.modelId.trim()) &&
    !savedMatchesDraft;

  return (
    <Card className="min-w-0">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            {PURPOSE_LABELS[purpose]}
          </CardTitle>

          <Badge
            variant="outline"
            className="border-border text-foreground"
          >
            {saved ? "Đã cấu hình" : "Chưa cấu hình"}
          </Badge>
        </div>

        <CardDescription>
          {PURPOSE_DESCRIPTIONS[purpose]}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label>Kết nối AI</Label>

            <Select
              value={draft.connectionId || "none"}
              disabled={disabled || busy}
              onValueChange={(value) => {
                onChange(purpose, {
                  connectionId:
                    value === "none" ? "" : value,
                  modelId: "",
                });
              }}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue
                  placeholder="Chọn kết nối AI"
                />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="none">
                  Chưa chọn kết nối
                </SelectItem>

                {availableConnections.map((connection) => (
                    <SelectItem
                      key={connection.id}
                      value={connection.id}
                    >
                      {connection.name} ({connection.provider})
                      {!connection.enabled
                        ? " — Đã tắt"
                        : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {selectedConnection && !selectedConnection.enabled && (
              <p className="text-xs text-muted-foreground">
                Kết nối này đã bị tắt. Hãy bật lại
                hoặc chọn kết nối khác.
              </p>
            )}

            {purpose === "embedding" && availableConnections.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Thêm hoặc bật kết nối OpenRouter/OpenAI để cấu hình embedding.
              </p>
            )}
          </div>

          <div className="min-w-0 space-y-2">
            <Label>Mô hình AI</Label>

            <ModelPicker
              provider={
                selectedConnection?.enabled
                  ? selectedConnection.provider
                  : undefined
              }
              value={draft.modelId}
              onChange={(modelId) =>
                onChange(purpose, { modelId })
              }
              disabled={disabled || busy}
              embeddingOnly={purpose === "embedding"}
            />
          </div>
        </div>

        {saved && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              Model đang được lưu:
            </span>{" "}
            <span className="break-all">
              {saved.modelId}
            </span>
          </div>
        )}

        {purpose === "embedding" && (
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
            Vector Knowledge Base dùng không gian 1536 dimensions. Cấu hình này độc lập với model chatbot và không gửi API key về trình duyệt.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!canSave}
            className={PRIMARY_CLASS}
            onClick={() => void onSave(purpose)}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Lưu model mặc định
          </Button>

          {saved && (
            <Button
              type="button"
              variant="outline"
              disabled={disabled || busy}
              onClick={() => void onRemove(purpose)}
            >
              Bỏ mặc định
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AiProvidersView() {
  const { data: organization } =
    authClient.useActiveOrganization();

  const organizationId = organization?.id;

  const [providers, setProviders] = useState<CatalogProvider[]>([]);
  const [connections, setConnections] = useState<
    AiProviderConnection[]
  >([]);
  const [defaults, setDefaults] = useState<AiModelDefault[]>([]);
  const [drafts, setDrafts] = useState(emptyDrafts);

  const [provider, setProvider] =
    useState<AiProviderType>("openrouter");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");

  const [testResults, setTestResults] = useState<
    Record<string, ConnectionTestResult>
  >({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [replaceKeyTarget, setReplaceKeyTarget] =
    useState<AiProviderConnection | null>(null);
  const [replacementKey, setReplacementKey] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<AiProviderConnection | null>(null);

  const loadData = useCallback(async () => {
    if (!organizationId) {
      setProviders([]);
      setConnections([]);
      setDefaults([]);
      setDrafts(emptyDrafts());
      setTestResults({});
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [
        providerData,
        connectionData,
        defaultData,
      ] = await Promise.all([
        aiProvidersApi.listCatalogProviders(),
        aiProvidersApi.listConnections(),
        aiProvidersApi.listModelDefaults(),
      ]);

      setProviders(providerData);
      setConnections(connectionData);
      setDefaults(defaultData);

      const nextDrafts = emptyDrafts();

      for (const item of defaultData) {
        if (AI_MODEL_PURPOSES.includes(item.purpose)) {
          nextDrafts[item.purpose] = {
            connectionId: item.connectionId,
            modelId: item.modelId,
          };
        }
      }

      setDrafts(nextDrafts);
    } catch (error) {
      toast.error("Không thể tải cấu hình AI.", {
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const providerNames = useMemo(
    () =>
      new Map(
        providers.map((item) => [
          item.id,
          item.name,
        ]),
      ),
    [providers],
  );

  const savedDefaults = useMemo(
    () =>
      new Map(
        defaults.map((item) => [
          item.purpose,
          item,
        ]),
      ),
    [defaults],
  );

  function updateDraft(
    purpose: AiModelPurpose,
    changes: Partial<ModelDraft>,
  ) {
    setDrafts((previous) => ({
      ...previous,
      [purpose]: {
        ...previous[purpose],
        ...changes,
      },
    }));
  }

  async function createConnection(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!organizationId) {
      toast.error("Vui lòng chọn tổ chức.");
      return;
    }

    if (!name.trim() || !apiKey.trim()) {
      toast.error("Vui lòng nhập tên và API key.");
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

      toast.success("Đã thêm kết nối AI.");
      await loadData();
    } catch (error) {
      toast.error("Không thể tạo kết nối.", {
        description: getErrorMessage(error),
      });
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
  ): Promise<boolean> {
    setBusyId(id);

    try {
      await aiProvidersApi.updateConnection(id, input);

      setTestResults((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });

      toast.success("Đã cập nhật kết nối AI.");
      await loadData();
      return true;
    } catch (error) {
      toast.error("Không thể cập nhật kết nối.", {
        description: getErrorMessage(error),
      });
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function saveReplacementKey(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!replaceKeyTarget) return;

    if (!replacementKey.trim()) {
      toast.error("API key không được để trống.");
      return;
    }

    const success = await updateConnection(
      replaceKeyTarget.id,
      { apiKey: replacementKey.trim() },
    );

    if (success) {
      setReplaceKeyTarget(null);
      setReplacementKey("");
    }
  }

  async function testConnection(id: string) {
    setBusyId(id);

    try {
      const result = await aiProvidersApi.testConnection(id);

      setTestResults((previous) => ({
        ...previous,
        [id]: result,
      }));

      if (result.success) {
        toast.success("Kết nối AI hoạt động.");
      } else {
        toast.error("Kiểm tra kết nối thất bại.", {
          description: result.message,
        });
      }
    } catch (error) {
      toast.error("Không thể kiểm tra kết nối.", {
        description: getErrorMessage(error),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function removeConnection() {
    if (!deleteTarget) return;

    const id = deleteTarget.id;
    setBusyId(id);

    try {
      await aiProvidersApi.deleteConnection(id);

      setDeleteTarget(null);

      setTestResults((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });

      toast.success("Đã xóa kết nối AI.");
      await loadData();
    } catch (error) {
      toast.error("Không thể xóa kết nối.", {
        description:
          "Kết nối có thể đang được model mặc định sử dụng. " +
          getErrorMessage(error),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function saveDefault(purpose: AiModelPurpose) {
    const draft = drafts[purpose];

    const selectedConnection = connections.find(
      (item) => item.id === draft.connectionId,
    );

    if (
      !selectedConnection?.enabled ||
      !draft.modelId.trim()
    ) {
      toast.error(
        "Vui lòng chọn kết nối đang bật và mô hình AI.",
      );
      return;
    }

    setBusyId(purpose);

    try {
      await aiProvidersApi.setModelDefault(purpose, {
        connectionId: selectedConnection.id,
        modelId: draft.modelId.trim(),
      });

      toast.success(
        `Đã lưu model cho ${PURPOSE_LABELS[purpose]}.`,
      );

      await loadData();
    } catch (error) {
      toast.error("Không thể lưu model mặc định.", {
        description: getErrorMessage(error),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function removeDefault(purpose: AiModelPurpose) {
    setBusyId(purpose);

    try {
      await aiProvidersApi.deleteModelDefault(purpose);

      toast.success("Đã bỏ cấu hình model mặc định.");
      await loadData();
    } catch (error) {
      toast.error("Không thể bỏ model mặc định.", {
        description: getErrorMessage(error),
      });
    } finally {
      setBusyId(null);
    }
  }

  const currentProvider = providers.find(
    (item) => item.id === provider,
  );

  const busy = saving || busyId !== null;

  return (
    <div className="w-full min-w-0 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Nhà cung cấp AI & Mô hình
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý kết nối AI và mô hình mặc định cho
            tổ chức.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={loading || busy || !organizationId}
          onClick={() => void loadData()}
        >
          <RefreshCw
            className={`size-4 ${loading ? "animate-spin" : ""}`}
          />
          Làm mới
        </Button>
      </header>

      {!organizationId && (
        <Card>
          <CardContent className="py-5 text-sm text-muted-foreground">
            Vui lòng chọn tổ chức trước khi cấu hình.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Thêm kết nối AI</CardTitle>
          <CardDescription>
            Thiết lập API key để chatbot sử dụng
            nhà cung cấp AI.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={(event) => void createConnection(event)}
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="space-y-2">
              <Label>Nhà cung cấp</Label>

              <Select
                value={provider}
                disabled={loading || saving}
                onValueChange={(value) =>
                  setProvider(value as AiProviderType)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder="Chọn nhà cung cấp"
                  />
                </SelectTrigger>

                <SelectContent>
                  {providers.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-connection-name">
                Tên kết nối
              </Label>

              <Input
                id="ai-connection-name"
                required
                maxLength={100}
                value={name}
                disabled={saving}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Ví dụ: CSKH - OpenRouter"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ai-provider-key">
                API Key
              </Label>

              <Input
                id="ai-provider-key"
                required
                type="password"
                autoComplete="new-password"
                maxLength={4096}
                value={apiKey}
                disabled={saving}
                onChange={(event) =>
                  setApiKey(event.target.value)
                }
                placeholder="Nhập API key"
              />

              <p className="text-xs text-muted-foreground">
                API key được mã hóa ở backend và không
                hiển thị lại sau khi lưu.
              </p>

              {currentProvider &&
                !currentProvider.catalogProvider && (
                  <p className="text-xs text-muted-foreground">
                    Nhà cung cấp này chưa hỗ trợ
                    danh mục model tự động.
                  </p>
                )}
            </div>

            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={
                  saving ||
                  loading ||
                  !organizationId ||
                  providers.length === 0
                }
                className={PRIMARY_CLASS}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Thêm kết nối
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            Danh sách kết nối ({connections.length})
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kiểm tra, bật/tắt và quản lý khóa API
            của từng kết nối.
          </p>
        </div>

        {loading && connections.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg border p-5 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Đang tải kết nối...
          </div>
        )}

        {!loading && connections.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Chưa có kết nối AI nào.
            </CardContent>
          </Card>
        )}

        {connections.map((connection) => {
          const testResult = testResults[connection.id];
          const connectionBusy = busyId === connection.id;
          const connectionLabel =
            providerNames.get(connection.provider) ??
            connection.provider;

          return (
            <Card key={connection.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">
                      {connection.name}
                    </h3>

                    <Badge
                      variant="outline"
                      className="text-foreground"
                    >
                      {connection.enabled
                        ? "Đang bật"
                        : "Đã tắt"}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {connectionLabel}
                    {" · "}
                    {connection.hasApiKey
                      ? "Đã lưu API key"
                      : "Chưa có API key"}
                  </p>

                  {testResult && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      {testResult.success ? (
                        <CheckCircle2 className="size-4 shrink-0 text-foreground" />
                      ) : (
                        <XCircle className="size-4 shrink-0 text-foreground" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      busy ||
                      !connection.enabled
                    }
                    onClick={() =>
                      void testConnection(connection.id)
                    }
                  >
                    {connectionBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Kiểm tra
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void updateConnection(
                        connection.id,
                        { enabled: !connection.enabled },
                      )
                    }
                  >
                    {connection.enabled ? "Tắt" : "Bật"}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setReplacementKey("");
                      setReplaceKeyTarget(connection);
                    }}
                  >
                    <KeyRound className="size-4" />
                    Đổi khóa
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setDeleteTarget(connection)}
                    aria-label={`Xóa ${connection.name}`}
                  >
                    <Trash2 className="size-4" />
                    Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            Chat Models
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mỗi chức năng có thể dùng kết nối và
            model riêng. Hiện tại, ưu tiên cấu hình
            Chăm sóc khách hàng.
          </p>
        </div>

        <div className="grid gap-4">
          {CHAT_MODEL_PURPOSES.map((purpose) => (
            <ModelDefaultCard
              key={`${organizationId ?? "none"}-${purpose}`}
              purpose={purpose}
              draft={drafts[purpose]}
              saved={savedDefaults.get(purpose)}
              connections={connections}
              busy={busyId === purpose}
              disabled={
                !organizationId ||
                loading ||
                busy
              }
              onChange={updateDraft}
              onSave={saveDefault}
              onRemove={removeDefault}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Embedding Models</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn connection và model riêng để lập chỉ mục Knowledge Base. Không dùng chung với chatbot.
          </p>
        </div>

        <ModelDefaultCard
          key={`${organizationId ?? "none"}-embedding`}
          purpose="embedding"
          draft={drafts.embedding}
          saved={savedDefaults.get("embedding")}
          connections={connections}
          busy={busyId === "embedding"}
          disabled={!organizationId || loading || busy}
          onChange={updateDraft}
          onSave={saveDefault}
          onRemove={removeDefault}
        />
      </section>

      <Dialog
        open={replaceKeyTarget !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setReplaceKeyTarget(null);
            setReplacementKey("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Thay đổi API key
            </DialogTitle>
            <DialogDescription>
              {replaceKeyTarget
                ? `Cập nhật khóa bảo mật cho kết nối "${replaceKeyTarget.name}".`
                : "Cập nhật khóa kết nối AI."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(event) =>
              void saveReplacementKey(event)
            }
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="replacement-ai-key">
                API key mới
              </Label>

              <Input
                id="replacement-ai-key"
                type="password"
                required
                autoComplete="new-password"
                maxLength={4096}
                value={replacementKey}
                disabled={busy}
                onChange={(event) =>
                  setReplacementKey(event.target.value)
                }
                placeholder="Nhập API key mới"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setReplaceKeyTarget(null);
                  setReplacementKey("");
                }}
              >
                Hủy
              </Button>

              <Button
                type="submit"
                className={PRIMARY_CLASS}
                disabled={busy || !replacementKey.trim()}
              >
                {busy && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Lưu API key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Xóa kết nối AI?
            </AlertDialogTitle>

            <AlertDialogDescription>
              Bạn có chắc muốn xóa kết nối{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? Kết nối đang được cấu hình làm model
              mặc định sẽ không thể xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              Hủy
            </AlertDialogCancel>

            <AlertDialogAction
              className={PRIMARY_CLASS}
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void removeConnection();
              }}
            >
              {busy && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
