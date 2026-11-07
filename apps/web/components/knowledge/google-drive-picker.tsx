"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { DatabaseZap, RefreshCw } from "lucide-react";

import { ApiError } from "@/lib/api-client";
import {
  knowledgeConnectionsApi,
  type GoogleDriveSourceLimits,
  type GoogleDriveSource,
} from "@/lib/knowledge-connections-api";
import {
  GoogleDriveSourceList,
  RemoveGoogleDriveSourceDialog,
} from "./google-drive-source-list";
import {
  getKnowledgeSourceStage,
  isKnowledgeSourceProcessing,
} from "./knowledge-source-status";

import { Button } from "@workspace/ui/components/button";

type PickerEvent = {
  action: string;
  docs?: Array<{ id: string }>;
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
  build: () => { setVisible: (visible: boolean) => void };
};
type GooglePickerApi = {
  PickerBuilder: new () => PickerBuilder;
  ViewId: { DOCS: string };
  Feature: { MULTISELECT_ENABLED: string };
  Action: { PICKED: string };
};

declare global {
  interface Window {
    gapi?: { load: (name: string, callback: () => void) => void };
    google?: { picker: GooglePickerApi };
  }
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002")
  .replace(/\/v1\/?$/, "")
  .replace(/\/$/, "");
const GOOGLE_ENDPOINT = `${API_BASE}/v1/knowledge-connections/google`;
const PROCESSING_POLL_WINDOW_MS = 5 * 60 * 1000;

async function googleApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${GOOGLE_ENDPOINT}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(" ")
      : body?.message;
    throw new Error(message ?? `API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function sourceSummary(sources: GoogleDriveSource[]) {
  return {
    total: sources.length,
    ready: sources.filter(
      (source) => getKnowledgeSourceStage(source) === "ready",
    ).length,
    pending: sources.filter(isKnowledgeSourceProcessing).length,
    embedding: sources.filter(
      (source) => getKnowledgeSourceStage(source) === "embedding",
    ).length,
    failed: sources.filter(
      (source) =>
        source.status === "failed" || source.documentStatus === "failed",
    ).length,
    chunks: sources.reduce((total, source) => total + source.chunkCount, 0),
    embeddings: sources.reduce(
      (total, source) => total + source.embeddingCount,
      0,
    ),
  };
}

export function GoogleDrivePicker() {
  const [sdkReady, setSdkReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sources, setSources] = useState<GoogleDriveSource[]>([]);
  const [limits, setLimits] = useState<GoogleDriveSourceLimits | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [removingSource, setRemovingSource] =
    useState<GoogleDriveSource | null>(null);
  const [removing, setRemoving] = useState(false);
  const [pollUntil, setPollUntil] = useState<number | null>(null);
  const developerKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;

  const refreshSources = useCallback(async () => {
    setSources(await knowledgeConnectionsApi.listGoogleSources());
  }, []);

  useEffect(() => {
    void refreshSources().catch(() =>
      setError("Không tải được danh sách tài liệu."),
    );
  }, [refreshSources]);

  useEffect(() => {
    void knowledgeConnectionsApi.getGoogleSourceLimits().then(setLimits).catch(
      () => undefined,
    );
  }, []);

  // A page opened while a known ingestion job is running should follow it,
  // but a stale database status must not cause permanent polling.
  useEffect(() => {
    if (sources.some(isKnowledgeSourceProcessing) && pollUntil === null) {
      setPollUntil(Date.now() + PROCESSING_POLL_WINDOW_MS);
    }
  }, [pollUntil, sources]);

  const shouldPoll = useMemo(() => {
    const processingWindowOpen =
      pollUntil !== null &&
      pollUntil > Date.now();
    if (!processingWindowOpen) return false;

    return (
      sources.some(isKnowledgeSourceProcessing) ||
      sources.some(
        (source) =>
          source.status === "ready" &&
          source.chunkCount > source.embeddingCount,
      )
    );
  }, [pollUntil, sources]);

  useEffect(() => {
    if (!shouldPoll) return;
    const timer = window.setTimeout(() => {
      void refreshSources().catch(() =>
        setError("Không thể cập nhật tiến trình tài liệu."),
      );
    }, 5_000);
    return () => window.clearTimeout(timer);
  }, [refreshSources, shouldPoll, sources]);

  const startPolling = () =>
    setPollUntil(Date.now() + PROCESSING_POLL_WINDOW_MS);

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
      const status = await googleApi<{ connected: boolean }>("/status");
      if (!status.connected) {
        window.location.assign(`${GOOGLE_ENDPOINT}/start`);
        return;
      }

      setBusy(true);
      const token = await googleApi<{
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
          .setOAuthToken(token.accessToken)
          .setDeveloperKey(developerKey)
          .setAppId(token.appId)
          .setOrigin(window.location.origin)
          .enableFeature(pickerApi.Feature.MULTISELECT_ENABLED)
          .setMaxItems(20)
          .setCallback((event) => {
            if (event.action !== pickerApi.Action.PICKED) return;
            const fileIds = (event.docs ?? [])
              .map((document) => document.id)
              .filter(Boolean);
            if (fileIds.length === 0) return;

            setBusy(true);
            void googleApi("/sources", {
              method: "POST",
              body: JSON.stringify({ fileIds }),
            })
              .then(async () => {
                startPolling();
                await refreshSources();
                setMessage("Đã thêm tài liệu; tiến trình sẽ tự cập nhật.");
              })
              .catch((requestError: unknown) => {
                setError(
                  requestError instanceof Error
                    ? requestError.message
                    : "Không thể lưu tài liệu đã chọn.",
                );
              })
              .finally(() => setBusy(false));
          })
          .build();

        picker.setVisible(true);
        setBusy(false);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không lấy được quyền truy cập Google Drive.",
      );
      setBusy(false);
    }
  }

  async function backfill() {
    if (backfilling) return;
    setBackfilling(true);
    setError("");
    setMessage("");
    try {
      const result = await knowledgeConnectionsApi.backfillEmbeddings();
      startPolling();
      await refreshSources();
      setMessage(
        result.queuedCount > 0
          ? `Đã xếp ${result.queuedCount} tài liệu để tạo embedding.`
          : "Không có tài liệu sẵn sàng cần tạo embedding.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof ApiError || requestError instanceof Error
          ? requestError.message
          : "Không thể backfill embedding.",
      );
    } finally {
      setBackfilling(false);
    }
  }

  async function retry(source: GoogleDriveSource) {
    if (retryingId) return;
    setRetryingId(source.id);
    setError("");
    try {
      await knowledgeConnectionsApi.retryGoogleSource(source.id);
      startPolling();
      await refreshSources();
      setMessage(`Đã xếp lại “${source.name}” để index.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể re-index tài liệu.",
      );
    } finally {
      setRetryingId(null);
    }
  }

  async function remove() {
    if (!removingSource || removing) return;
    setRemoving(true);
    setError("");
    try {
      await knowledgeConnectionsApi.removeGoogleSource(removingSource.id);
      setSources((current) =>
        current.filter((source) => source.id !== removingSource.id),
      );
      setMessage(
        `Đã remove “${removingSource.name}” khỏi Knowledge Base. File Google Drive không bị thay đổi.`,
      );
      setRemovingSource(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể remove source.",
      );
    } finally {
      setRemoving(false);
    }
  }

  const summary = sourceSummary(sources);

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
          File được chọn chỉ được sao chép vào Knowledge Base; thao tác remove
          không xóa file gốc trên Google Drive.
        </p>
      </div>

      {limits && (
        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Giới hạn khi index</p>
          <p className="mt-1">
            Hỗ trợ {limits.supportedFormats.join(", ")}. Dung lượng tải xuống tối đa {Math.floor(limits.maxDownloadBytes / 1024 / 1024)} MB;
            văn bản sau khi trích xuất tối đa {limits.maxTextCharacters.toLocaleString("vi-VN")} ký tự.
          </p>
          <p className="mt-1">
            File PDF nén vẫn có thể vượt giới hạn ký tự. File phải còn quyền truy cập và có văn bản có thể trích xuất.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-7">
        {[
          ["Nguồn", summary.total],
          ["Sẵn sàng", summary.ready],
          ["Chờ / Indexing", summary.pending],
          ["Embedding", summary.embedding],
          ["Failed", summary.failed],
          ["Chunks", summary.chunks],
          ["Embeddings", summary.embeddings],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-md border bg-muted/30 px-3 py-2"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-semibold tabular-nums">{value}</p>
          </div>
        ))}
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
          <RefreshCw className="size-4" /> Làm mới
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={backfilling}
          onClick={() => void backfill()}
        >
          <DatabaseZap
            className={backfilling ? "size-4 animate-pulse" : "size-4"}
          />
          {backfilling ? "Đang xếp hàng..." : "Backfill embeddings"}
        </Button>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          {message}
        </p>
      )}

      <GoogleDriveSourceList
        sources={sources}
        removingId={removing ? removingSource?.id ?? null : null}
        retryingId={retryingId}
        onRemove={setRemovingSource}
        onRetry={(source) => void retry(source)}
      />
      <RemoveGoogleDriveSourceDialog
        source={removingSource}
        pending={removing}
        onOpenChange={(open) => {
          if (!open && !removing) setRemovingSource(null);
        }}
        onConfirm={(event) => {
          // Keep the confirmation open while the deletion request is in flight.
          event.preventDefault();
          void remove();
        }}
      />
    </section>
  );
}
