
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import {
  CheckCircle2Icon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";

import {
  aiProvidersApi,
  AI_MODEL_PURPOSES,
  type AiModelPurpose,
  type AiProviderConnection,
  type AiModelDefault,
  type AiProviderType,
  type CatalogModel,
  type CatalogProvider,
  type ConnectionTestResult,
} from "@/lib/ai-providers-api";
import { authClient } from "@/lib/auth-client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

type ModelDraft = {
  connectionId: string;
  modelId: string;
};

type ModelCatalogState = {
  loading: boolean;
  error: boolean;
  models: CatalogModel[];
};

const PURPOSE_LABELS: Record<AiModelPurpose, string> = {
  customer_support: "Chăm sóc khách hàng",
  message_enhancement: "Cải thiện tin nhắn",
  general: "Tác vụ chung",
};

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
  };
}

function ModelPicker({
  models,
  value,
  onChange,
  loading,
  error,
  disabled,
}: {
  models: CatalogModel[];
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  error: boolean;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return models.slice(0, 100);

    return models
      .filter((model) =>
        `${model.name} ${model.id}`
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 100);
  }, [models, query]);

  const selectedModel = models.find(
    (model) => model.id === value,
  );

  return (
    <div className="space-y-2">
      <Label>Model</Label>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Tìm tên model..."
          className="pl-9"
          disabled={disabled || loading}
        />
      </div>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        disabled={
          disabled ||
          loading ||
          error ||
          models.length === 0
        }
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
      >
        <option value="">
          {loading
            ? "Đang tải model..."
            : error
              ? "Không tải được model"
              : models.length === 0
                ? "Chưa có model trong catalog"
                : "Chọn model"}
        </option>

        {value && !selectedModel && (
          <option value={value}>
            {value} (đã lưu, không có trong catalog)
          </option>
        )}

        {filtered.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}

        {selectedModel &&
          !filtered.some(
            (model) => model.id === selectedModel.id,
          ) && (
            <option
              value={selectedModel.id}
            >
              {selectedModel.name}
            </option>
          )}
      </select>

      {selectedModel && (
        <p className="text-xs text-muted-foreground">
          ID: {selectedModel.id}
          {selectedModel.contextWindow
            ? ` · Context: ${selectedModel.contextWindow.toLocaleString()} tokens`
            : ""}
        </p>
      )}

      {error && (
        <p className="text-xs text-destructive">
          Catalog không khả dụng. Thử làm mới.
        </p>
      )}
    </div>
  );
}

export function AiProvidersView() {
  const { data: organization } =
    authClient.useActiveOrganization();

  const organizationId = organization?.id;

  const [providers, setProviders] =
    useState<CatalogProvider[]>([]);
  const [connections, setConnections] =
    useState<AiProviderConnection[]>([]);
  const [defaults, setDefaults] =
    useState<AiModelDefault[]>([]);
  const [drafts, setDrafts] = useState(emptyDrafts);

  const [provider, setProvider] =
    useState<AiProviderType>("openrouter");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");

  const [catalogs, setCatalogs] = useState<
    Partial<Record<AiProviderType, ModelCatalogState>>
  >({});

  const [testResults, setTestResults] = useState<
    Record<string, ConnectionTestResult>
  >({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] =
    useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!organizationId) {
      setProviders([]);
      setConnections([]);
      setDefaults([]);
      setDrafts(emptyDrafts());
      setCatalogs({});
      setTestResults({});
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

      const next = emptyDrafts();

      for (const item of defaultData) {
        if (
          AI_MODEL_PURPOSES.includes(
            item.purpose,
          )
        ) {
          next[item.purpose] = {
            connectionId: item.connectionId,
            modelId: item.modelId,
          };
        }
      }

      setDrafts(next);
    } catch {
      toast.error(
        "Không tải được cấu hình AI Providers.",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedProviders = useMemo(() => {
    const result = new Set<AiProviderType>();

    for (const purpose of AI_MODEL_PURPOSES) {
      const connection = connections.find(
        (item) =>
          item.id === drafts[purpose].connectionId,
      );

      if (connection) {
        result.add(connection.provider);
      }
    }

    return [...result];
  }, [connections, drafts]);

  const selectedProviderKey =
    selectedProviders.slice().sort().join(",");

  useEffect(() => {
    if (!organizationId) return;

    for (const selectedProvider of selectedProviders) {
      if (catalogs[selectedProvider]) continue;

      setCatalogs((previous) => ({
        ...previous,
        [selectedProvider]: {
          loading: true,
          error: false,
          models: [],
        },
      }));

      void aiProvidersApi
        .listCatalogModels(selectedProvider)
        .then((models) => {
          setCatalogs((previous) => ({
            ...previous,
            [selectedProvider]: {
              loading: false,
              error: false,
              models,
            },
          }));
        })
        .catch(() => {
          setCatalogs((previous) => ({
            ...previous,
            [selectedProvider]: {
              loading: false,
              error: true,
              models: [],
            },
          }));
        });
    }
    // Catalog entries are cached in component state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, selectedProviderKey]);

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
      await aiProvidersApi.updateConnection(
        id,
        input,
      );

      setTestResults((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });

      toast.success("Đã cập nhật connection.");
      await loadData();
    } catch {
      toast.error("Không thể cập nhật connection.");
    } finally {
      setBusyId(null);
    }
  }

  async function replaceKey(id: string) {
    const newKey = window.prompt(
      "Nhập API key mới:",
    );

    if (newKey === null) return;

    if (!newKey.trim()) {
      toast.error("API key không được để trống.");
      return;
    }

    await updateConnection(id, {
      apiKey: newKey.trim(),
    });
  }

  async function testConnection(id: string) {
    setBusyId(id);

    try {
      const result =
        await aiProvidersApi.testConnection(id);

      setTestResults((previous) => ({
        ...previous,
        [id]: result,
      }));

      if (result.success) {
        toast.success("API key hợp lệ.");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Không thể kiểm tra connection.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeConnection(id: string) {
    if (
      !window.confirm(
        "Xóa AI connection này?",
      )
    ) return;

    setBusyId(id);

    try {
      await aiProvidersApi.deleteConnection(id);

      setTestResults((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });

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

  async function saveDefault(
    purpose: AiModelPurpose,
  ) {
    const draft = drafts[purpose];

    if (
      !draft.connectionId ||
      !draft.modelId.trim()
    ) {
      toast.error(
        "Chọn connection và model.",
      );
      return;
    }

    setBusyId(purpose);

    try {
      await aiProvidersApi.setModelDefault(
        purpose,
        {
          connectionId: draft.connectionId,
          modelId: draft.modelId.trim(),
        },
      );

      toast.success(
        "Đã lưu model mặc định.",
      );

      await loadData();
    } catch {
      toast.error(
        "Không thể lưu model mặc định.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeDefault(
    purpose: AiModelPurpose,
  ) {
    setBusyId(purpose);

    try {
      await aiProvidersApi.deleteModelDefault(
        purpose,
      );

      toast.success(
        "Đã xóa model mặc định.",
      );

      await loadData();
    } catch {
      toast.error(
        "Không thể xóa model mặc định.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const enabledConnections = connections.filter(
    (item) => item.enabled,
  );

  const currentProvider = providers.find(
    (item) => item.id === provider,
  );

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
            onSubmit={(event) =>
              void createConnection(event)
            }
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="provider">
                Provider
              </Label>

              <select
                id="provider"
                value={provider}
                onChange={(event) =>
                  setProvider(
                    event.target.value as AiProviderType,
                  )
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {providers.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
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
              <Label htmlFor="api-key">
                API Key
              </Label>

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
                API key được mã hóa ở backend.
                Không hiển thị lại sau khi lưu.
              </p>

              {currentProvider &&
                !currentProvider.catalogProvider && (
                  <p className="text-xs text-amber-600">
                    Provider này chưa hỗ trợ catalog model tự động.
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

          {connections.map((item) => {
            const testResult = testResults[item.id];

            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-background p-5"
              >
                <div className="space-y-1">
                  <p className="font-semibold">
                    {item.name}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {providers.find(
                      (entry) =>
                        entry.id === item.provider,
                    )?.name ?? item.provider}
                    {" · "}
                    {item.hasApiKey
                      ? "API key đã lưu"
                      : "Chưa có API key"}
                  </p>

                  <p className="text-xs">
                    {item.enabled
                      ? "Đang bật"
                      : "Đã tắt"}
                  </p>

                  {testResult && (
                    <div className="flex items-center gap-2 text-xs">
                      {testResult.success ? (
                        <CheckCircle2Icon className="size-4 text-green-600" />
                      ) : (
                        <XCircleIcon className="size-4 text-destructive" />
                      )}
                      <span>
                        {testResult.message}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      busyId === item.id ||
                      !item.enabled
                    }
                    onClick={() =>
                      void testConnection(item.id)
                    }
                  >
                    {busyId === item.id ? (
                      <Loader2Icon className="mr-1 size-4 animate-spin" />
                    ) : (
                      <RefreshCwIcon className="mr-1 size-4" />
                    )}
                    Test
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === item.id}
                    onClick={() =>
                      void updateConnection(
                        item.id,
                        {
                          enabled: !item.enabled,
                        },
                      )
                    }
                  >
                    {item.enabled ? "Tắt" : "Bật"}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === item.id}
                    onClick={() =>
                      void replaceKey(item.id)
                    }
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
            );
          })}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Model Defaults
          </h2>

          <p className="text-sm text-muted-foreground">
            Chọn connection và model cho từng mục đích.
            Danh sách model được lấy từ catalog bên ngoài.
          </p>

          {AI_MODEL_PURPOSES.map((purpose) => {
            const draft = drafts[purpose];

            const saved = defaults.some(
              (item) =>
                item.purpose === purpose,
            );

            const selectedConnection =
              connections.find(
                (item) =>
                  item.id === draft.connectionId,
              );

            const catalog = selectedConnection
              ? catalogs[selectedConnection.provider]
              : undefined;

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
                    <Label>
                      Connection
                    </Label>

                    <select
                      value={draft.connectionId}
                      onChange={(event) =>
                        updateDraft(
                          purpose,
                          {
                            connectionId:
                              event.target.value,
                            modelId: "",
                          },
                        )
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
                            item.id ===
                              draft.connectionId,
                        )
                        .map((item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.name}
                            {" ("}
                            {item.provider}
                            {")"}
                            {!item.enabled
                              ? " - đã tắt"
                              : ""}
                          </option>
                        ))}
                    </select>
                  </div>

                  <ModelPicker
                    key={`${purpose}-${draft.connectionId}`}
                    models={catalog?.models ?? []}
                    value={draft.modelId}
                    onChange={(modelId) =>
                      updateDraft(
                        purpose,
                        { modelId },
                      )
                    }
                    loading={
                      Boolean(selectedConnection) &&
                      (!catalog || catalog.loading)
                    }
                    error={catalog?.error ?? false}
                    disabled={
                      !selectedConnection ||
                      !selectedConnection.enabled
                    }
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={
                      busyId === purpose ||
                      !organizationId ||
                      !draft.modelId ||
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
                      disabled={
                        busyId === purpose
                      }
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
