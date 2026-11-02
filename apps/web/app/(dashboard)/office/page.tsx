
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Info,
  Monitor,
  RotateCcw,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { workforceApi } from "@/lib/workforce-api";
import { OFFICE_LAYOUT } from "@/modules/office/config/office-layout";

import type {
  OfficeSceneController,
} from "@/modules/office/scene/office-scene";

type OfficeStats = {
  agents: number;
  departments: number;
};

const DESKS = OFFICE_LAYOUT.desks;

function deskLabel(deskId: string) {
  const index = DESKS.findIndex(
    (desk) => desk.id === deskId,
  );

  return index >= 0
    ? `Bàn làm việc ${String(index + 1).padStart(2, "0")}`
    : deskId;
}

export default function OfficePage() {
  const mountRef = useRef<HTMLDivElement>(null);

  const controllerRef =
    useRef<OfficeSceneController | null>(null);

  const [stats, setStats] = useState<OfficeStats>({
    agents: 0,
    departments: 0,
  });

  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] =
    useState<string | null>(null);
  const [dataError, setDataError] =
    useState<string | null>(null);

  const [selectedDeskId, setSelectedDeskId] =
    useState<string | null>(null);

  const [showDeskList, setShowDeskList] =
    useState(true);

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

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let controller: OfficeSceneController | null = null;

    async function initialize() {
      try {
        const { createOfficeScene } = await import(
          "@/modules/office/scene/office-scene"
        );

        if (cancelled || !mount) return;

        controller = createOfficeScene(mount, {
          onDeskSelect: (deskId) => {
            if (!cancelled) {
              setSelectedDeskId(deskId);
            }
          },
        });

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

  function selectDesk(deskId: string | null) {
    controllerRef.current?.selectDesk(deskId);
  }

  const selectedDesk = DESKS.find(
    (desk) => desk.id === selectedDeskId,
  );

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
              3D · Interactive
            </span>
          </h1>

          <p className="text-sm text-muted-foreground">
            Click vào bàn để xem thông tin.
            Kéo chuột để xoay, cuộn để zoom.
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
          Nhân viên AI: <strong>{stats.agents}</strong>
        </div>

        <div className="rounded-lg border bg-card px-4 py-2">
          Phòng ban: <strong>{stats.departments}</strong>
        </div>

        <div className="rounded-lg border bg-card px-4 py-2">
          Bàn làm việc: <strong>{DESKS.length}</strong>
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

      <div className="relative min-h-[560px] flex-1 overflow-hidden rounded-2xl border bg-slate-100">
        <div
          ref={mountRef}
          className="absolute inset-0 touch-none"
        />

        {!ready && !sceneError && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-slate-600">
            Đang dựng văn phòng 3D...
          </div>
        )}

        <div className="absolute left-4 top-4 flex flex-col gap-2">
          <div className="rounded-lg bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm">
            WORKSPACE · {DESKS.length} bàn
          </div>

          <Button
            size="sm"
            variant="secondary"
            disabled={!ready}
            onClick={() => setShowDeskList((v) => !v)}
          >
            <Monitor className="mr-2 size-4" />
            {showDeskList ? "Ẩn danh sách bàn" : "Hiện danh sách bàn"}
          </Button>

          {showDeskList && (
            <div className="max-h-[290px] w-[210px] overflow-y-auto rounded-xl border bg-white/95 p-2 shadow-lg">
              <p className="px-2 pb-2 text-xs font-semibold text-slate-500">
                WORKSTATIONS
              </p>

              <div className="space-y-1">
                {DESKS.map((desk) => {
                  const active =
                    selectedDeskId === desk.id;

                  return (
                    <button
                      key={desk.id}
                      type="button"
                      disabled={!ready}
                      onClick={() => selectDesk(desk.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs transition-colors ${
                        active
                          ? "bg-emerald-100 font-semibold text-emerald-900"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Monitor className="size-3.5" />
                        {deskLabel(desk.id)}
                      </span>

                      {active ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <ChevronRight className="size-3.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {selectedDesk && (
          <div className="absolute bottom-20 left-4 right-4 z-10 rounded-xl border bg-white/95 p-4 text-slate-800 shadow-xl backdrop-blur-sm sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:w-[300px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Selected workstation
                </p>

                <h2 className="mt-1 text-lg font-bold">
                  {deskLabel(selectedDesk.id)}
                </h2>
              </div>

              <Button
                size="icon"
                variant="ghost"
                aria-label="Đóng thông tin bàn"
                onClick={() => selectDesk(null)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">
                  Mã bàn
                </span>
                <span className="font-mono font-medium">
                  {selectedDesk.id}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-500">
                  Khu vực
                </span>
                <span className="font-medium">
                  Workstation
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-500">
                  Vị trí
                </span>
                <span className="font-mono text-xs">
                  X: {selectedDesk.position[0]},
                  Z: {selectedDesk.position[1]}
                </span>
              </div>

              <div className="rounded-lg border border-dashed bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <Info className="size-4 text-slate-500" />
                  <span className="font-semibold">
                    Chưa gán AI Agent
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Chức năng gán nhân viên AI vào bàn sẽ
                  được triển khai trong task tiếp theo.
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <Link href="/workforce?tab=agents">
                  <Users className="mr-2 size-4" />
                  Xem danh sách AI Agent
                </Link>
              </Button>
            </div>
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
      </div>

      <p className="text-xs text-muted-foreground">
        Office V0.4 — Interactive workstations.
        Chọn bàn bằng chuột hoặc danh sách.
        Nhấn Escape để bỏ chọn.
      </p>
    </div>
  );
}
