"use client";

import { useState } from "react";
import Script from "next/script";

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
};

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002")
  .replace(/\/v1\/?$/, "")
  .replace(/\/$/, "");

const ENDPOINT = `${API_BASE}/v1/knowledge-connections/google`;

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

  const developerKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;

  async function refreshSources() {
    const list = await api<SavedSource[]>("/sources");
    setSources(list);
  }

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
        <button
          type="button"
          disabled={busy || !sdkReady}
          onClick={() => void openPicker()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Đang xử lý..." : "Chọn tài liệu từ Google Drive"}
        </button>

        <button
          type="button"
          onClick={() =>
            void refreshSources().catch(() =>
              setError("Không tải được danh sách tài liệu."),
            )
          }
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Làm mới danh sách
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      {message && <p className="text-sm text-green-600">{message}</p>}

      <div className="space-y-2">
        {sources.map((source) => (
          <div
            key={source.id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <span className="min-w-0 truncate text-sm">{source.name}</span>

            <span className="shrink-0 text-xs text-muted-foreground">
              {source.status}
            </span>
          </div>
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
