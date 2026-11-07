"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { RefreshCw, RotateCcw } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";

type PickerDocument = {
  id: string;
  name?: string;
};

type PickerEvent = {
  action: string;
  docs?: PickerDocument[];
};

type PickerInstance = {
  setVisible: (visible: boolean) => void;
};

type PickerBuilder = {
  addView: (view: string) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setAppId: (id: string) => PickerBuilder;
  setOrigin: (origin: string) => PickerBuilder;
  setMaxItems: (count: number) => PickerBuilder;
  enableFeature: (feature: string) => PickerBuilder;
  setCallback: (callback: (event: PickerEvent) => void) => PickerBuilder;
  build: () => PickerInstance;
};

type GooglePickerApi = {
  PickerBuilder: new () => PickerBuilder;
  ViewId: { DOCS: string };
  Feature: { MULTISELECT_ENABLED: string };
  Action: { PICKED: string };
};

declare global {
  interface Window {
    gapi?: {
      load: (name: string, callback: () => void) => void;
    };
    google?: {
      picker: GooglePickerApi;
    };
  }
}

type SavedSource = {
  id: string;
  name: string;
  mimeType: string | null;
  status: string;
  lastIndexedAt: string | null;
  chunkCount: number;
  embeddingCount: number;
  embeddingProvider: string | null;
};

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002")
  .replace(/\/v1\/?$/, "")
  .replace(/\/$/, "");

const ENDPOINT = `${API_BASE}/v1/knowledge-connections/google`;
const EMBEDDING_ENDPOINT =
  `${API_BASE}/v1/knowledge-connections/embeddings/backfill`;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ENDPOINT}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export function GoogleDrivePicker() {
  const [sdkReady, setSdkReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sources, setSources] = useState<SavedSource[]>([]);
  const [message, setMessage] = useState("");
  const [backfilling, setBackfilling] = useState(false);

  const developerKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;

  async function refreshSources() {
    const list = await api<SavedSource[]>("/sources");
    setSources(list);
  }

  useEffect(() => {
    void refreshSources().catch(() =>
      setError("Không tải được danh sách tài liệu."),
    );
  }, []);

  async function openPicker() {
    if (busy) return;

    setError("");
    setMessage("");

    if (!developerKey) {
      setError("Google Picker chưa được cấu hình.");
      return;
    }

    if (!sdkReady || !window.gapi) {
      setError("Google Picker chưa tải xong.");
      return;
    }

    try {
      const status = await api<{
        connected: boolean;
      }>("/status");

      if (!status.connected) {
        // OAuth is a top-level browser navigation, not a fetch request.
        window.location.assign(`${ENDPOINT}/start`);
        return;
      }

      setBusy(true);

      const result = await api<{
        accessToken: string;
        expiresIn: number;
        appId: string;
      }>("/picker-token");

      window.gapi.load("picker", () => {
        const pickerApi = window.google?.picker;

        if (!pickerApi) {
          setError("Không thể khởi tạo Google Picker.");
          setBusy(false);
          return;
        }

        const picker = new pickerApi.PickerBuilder()
          .addView(pickerApi.ViewId.DOCS)
          .setOAuthToken(result.accessToken)
          .setDeveloperKey(developerKey)
          .setAppId(result.appId)
          .setOrigin(window.location.origin)
          .enableFeature(pickerApi.Feature.MULTISELECT_ENABLED)
          .setMaxItems(20)
          .setCallback(async (event) => {
            if (event.action !== pickerApi.Action.PICKED) {
              return;
            }

            const ids = (event.docs ?? []).map((doc) => doc.id).filter(Boolean);

            if (!ids.length) return;

            setBusy(true);

            void api<{
              success: boolean;
              selected: SavedSource[];
            }>("/sources", {
              method: "POST",
              body: JSON.stringify({ fileIds: ids }),
            })
              .then(async () => {
                await refreshSources();
                setMessage("Đã lưu tài liệu được chọn.");
              })
              .catch(() => {
                setError("Không thể lưu một số tài liệu đã chọn.");
              })
              .finally(() => setBusy(false));
          })
          .build();

        picker.setVisible(true);
        setBusy(false);
      });
    } catch {
      setError("Không lấy được quyền truy cập Google Drive. Hãy kiểm tra kết nối.");
    } finally {
      setBusy(false);
    }
  }

  async function backfill() {
    if (backfilling) return;

    setBackfilling(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(EMBEDDING_ENDPOINT, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message = Array.isArray(payload?.message)
          ? payload.message.join(" ")
          : payload?.message;
        throw new Error(message || "Embedding backfill failed");
      }

      const result = (await response.json()) as {
        queuedCount: number;
        message: string;
      };
      setMessage(
        result.queuedCount > 0
          ? `Đã xếp ${result.queuedCount} tài liệu để tạo embedding.`
          : "Không có tài liệu ready cần tạo embedding.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Không thể backfill embedding. Hãy kiểm tra cấu hình Embedding Model trong AI Providers.",
      );
    } finally {
      setBackfilling(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border p-5">
      <Script
        src="https://apis.google.com/js/api.js"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />

      <div>
        <h2 className="text-lg font-semibold">Google Drive Knowledge</h2>

        <p className="text-sm text-muted-foreground">
          Chọn tài liệu từ Google Drive của doanh nghiệp. Chỉ những file được
          cấp quyền mới được thêm vào Knowledge Base.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={busy || !sdkReady}
          onClick={() => void openPicker()}
        >
          {busy ? "Đang xử lý..." : "Chọn tài liệu từ Google Drive"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void refreshSources().catch(() =>
              setError("Không tải được danh sách tài liệu."),
            )
          }
        >
          <RefreshCw className="size-4" />
          Làm mới danh sách
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={backfilling}
          onClick={() => void backfill()}
        >
          <RotateCcw className={backfilling ? "size-4 animate-spin" : "size-4"} />
          {backfilling ? "Đang xếp hàng..." : "Backfill embeddings"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      {message && <p className="text-sm text-green-600">{message}</p>}

      <div className="space-y-2">
        {sources.map((source) => (
          <article
            key={source.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{source.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {source.chunkCount} chunks · {source.embeddingCount} embeddings
                {source.embeddingProvider ? ` · ${source.embeddingProvider}` : ""}
              </p>
              {source.lastIndexedAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Indexed: {new Intl.DateTimeFormat("vi-VN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(source.lastIndexedAt))}
                </p>
              )}
            </div>

            <Badge variant="outline" className="shrink-0 text-foreground">
              {source.status}
            </Badge>
          </article>
        ))}

        {sources.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Chưa tải danh sách hoặc chưa có tài liệu.
          </p>
        )}
      </div>
    </section>
  );
}
