
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  RotateCcw,
  Users,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { workforceApi } from "@/lib/workforce-api";

import type { OfficeSceneController } from "@/modules/office/scene/office-scene";

type OfficeStats = {
  agents: number;
  departments: number;
};

export default function OfficePage() {
  const mountRef = useRef<HTMLDivElement>(null);

  const controllerRef =
    useRef<OfficeSceneController | null>(null);

  const [stats, setStats] = useState<OfficeStats>({
    agents: 0,
    departments: 0,
  });

  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(
    null,
  );
  const [dataError, setDataError] = useState<string | null>(
    null,
  );

  // Load workforce statistics.
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      workforceApi.listAgents(),
      workforceApi.listDepartments(),
    ])
      .then(([agents, departments]) => {
        if (cancelled) return;

        setStats({
          agents: agents.length,
          departments: departments.length,
        });
      })
      .catch(() => {
        if (cancelled) return;

        setDataError(
          "Không tải được thống kê Agent/Department.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize the 3D scene.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let controller: OfficeSceneController | null = null;

    async function initialize() {
      try {
        // Load Three.js only on the client.
        const { createOfficeScene } = await import(
          "@/modules/office/scene/office-scene"
        );

        if (cancelled || !mount) return;

        controller = createOfficeScene(mount);

        if (cancelled) {
          controller.dispose();
          return;
        }

        controllerRef.current = controller;
        setReady(true);
      } catch (error) {
        if (cancelled) return;

        setSceneError(
          error instanceof Error
            ? error.message
            : "Không thể khởi tạo văn phòng 3D.",
        );
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      controller?.dispose();

      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="size-4" />
            AI COMPANY / OFFICE
          </div>

          <h1 className="mt-1 text-2xl font-bold">
            My AI Office{" "}
            <span className="text-sm font-normal text-muted-foreground">
              3D · Refactored
            </span>
          </h1>

          <p className="text-sm text-muted-foreground">
            Không gian văn phòng 3D — kéo chuột để xoay,
            cuộn để zoom.
          </p>
        </div>

        <Button variant="outline" asChild>
          <Link href="/workforce?tab=agents">
            <Users className="mr-2 size-4" />
            Quản lý nhân viên
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <div className="rounded-lg border bg-card px-4 py-2">
          Nhân viên AI:{" "}
          <strong>{stats.agents}</strong>
        </div>

        <div className="rounded-lg border bg-card px-4 py-2">
          Phòng ban:{" "}
          <strong>{stats.departments}</strong>
        </div>

        <div className="rounded-lg border bg-card px-4 py-2">
          Bản dựng:{" "}
          <strong>Văn phòng 3D</strong>
        </div>
      </div>

      {dataError && (
        <p
          role="alert"
          className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm"
        >
          {dataError}
        </p>
      )}

      {sceneError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm"
        >
          {sceneError}
        </p>
      )}

      <div className="relative min-h-[520px] flex-1 overflow-hidden rounded-2xl border bg-slate-100">
        <div
          ref={mountRef}
          className="absolute inset-0 touch-none"
        />

        {!ready && !sceneError && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-slate-600">
            Đang dựng văn phòng 3D...
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex gap-2">
          <Button
            size="icon"
            variant="secondary"
            aria-label="Thu nhỏ"
            disabled={!ready}
            onClick={() =>
              controllerRef.current?.zoom(0.8)
            }
          >
            <ZoomOut className="size-4" />
          </Button>

          <Button
            size="icon"
            variant="secondary"
            aria-label="Phóng to"
            disabled={!ready}
            onClick={() =>
              controllerRef.current?.zoom(1.25)
            }
          >
            <ZoomIn className="size-4" />
          </Button>

          <Button
            size="icon"
            variant="secondary"
            aria-label="Đặt lại góc nhìn"
            disabled={!ready}
            onClick={() =>
              controllerRef.current?.reset()
            }
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>

        <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-white/85 px-3 py-2 text-xs text-slate-700 shadow-sm">
          WORKSPACE · 6 bàn · phòng họp · lễ tân · lounge
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        V0.1 Refactor — Three.js được quản lý độc lập
        với React UI. Dữ liệu nhân viên và phòng ban
        lấy từ API thật.
      </p>
    </div>
  );
}
