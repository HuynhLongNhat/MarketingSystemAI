
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Info,
  Monitor,
  RefreshCw,
  RotateCcw,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";

import {
  workforceApi,
  type AiAgent,
  type Department,
} from "@/lib/workforce-api";
import {
  officeApi,
  type OfficeDeskAssignment,
} from "@/lib/office-api";
import { ApiError } from "@/lib/api-client";

import { OFFICE_LAYOUT } from "@/modules/office/config/office-layout";
import {
  isOfficeEligible,
  mapAgentsToOffice,
} from "@/modules/office/config/office-agent-mapping";

import type {
  OfficeSceneController,
} from "@/modules/office/scene/office-scene";

const DESKS = OFFICE_LAYOUT.desks;

const STATUS_LABELS: Record<AiAgent["status"], string> = {
  draft: "Bản nháp",
  active: "Đang kích hoạt",
  paused: "Tạm dừng",
  archived: "Đã lưu trữ",
};

function deskLabel(deskId: string) {
  const index = DESKS.findIndex(
    (desk) => desk.id === deskId,
  );

  return index < 0
    ? deskId
    : `Bàn làm việc ${String(index + 1).padStart(2, "0")}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "Bạn không có quyền quản lý bàn làm việc.";
    }
    if (error.status === 409) {
      return "Bàn đã có Agent khác hoặc dữ liệu vừa thay đổi. Hãy làm mới.";
    }
    if (error.status === 400) {
      return "Agent hoặc bàn làm việc không hợp lệ.";
    }
    if (error.status === 404) {
      return "Không tìm thấy Agent trong tổ chức hiện tại.";
    }
  }

  return error instanceof Error
    ? error.message
    : "Đã xảy ra lỗi. Vui lòng thử lại.";
}

export default function OfficePage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef =
    useRef<OfficeSceneController | null>(null);

  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [departments, setDepartments] =
    useState<Department[]>([]);
  const [savedAssignments, setSavedAssignments] =
    useState<OfficeDeskAssignment[]>([]);

  const [ready, setReady] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sceneError, setSceneError] =
    useState<string | null>(null);
  const [dataError, setDataError] =
    useState<string | null>(null);
  const [actionError, setActionError] =
    useState<string | null>(null);
  const [actionMessage, setActionMessage] =
    useState<string | null>(null);

  const [selectedDeskId, setSelectedDeskId] =
    useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] =
    useState("");
  const [showDeskList, setShowDeskList] =
    useState(true);

  const requestIdRef = useRef(0);
  const savingRef = useRef(false);

  const mapping = useMemo(
    () =>
      mapAgentsToOffice(
        agents,
        departments,
        savedAssignments,
      ),
    [agents, departments, savedAssignments],
  );

  const charactersRef = useRef(mapping.characters);
  charactersRef.current = mapping.characters;

  const assignmentByDesk = useMemo(
    () =>
      new Map(
        mapping.assignments.map((item) => [
          item.deskId,
          item,
        ]),
      ),
    [mapping.assignments],
  );

  const deskByAgent = useMemo(
    () =>
      new Map(
        mapping.assignments.map((item) => [
          item.agent.id,
          item.deskId,
        ]),
      ),
    [mapping.assignments],
  );

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoadingData(true);
    setDataError(null);

    try {
      const [nextAgents, nextDepartments, nextAssignments] =
        await Promise.all([
          workforceApi.listAgents(),
          workforceApi.listDepartments(),
          officeApi.listAssignments(),
        ]);

      if (requestId !== requestIdRef.current) return;

      setAgents(nextAgents);
      setDepartments(nextDepartments);
      setSavedAssignments(nextAssignments);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setDataError(errorMessage(error));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingData(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadData();

    return () => {
      requestIdRef.current++;
    };
  }, [loadData]);

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
        controller.setCharacters(charactersRef.current);
        setReady(true);
      } catch (error) {
        if (cancelled) return;

        setSceneError(errorMessage(error));
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

  useEffect(() => {
    controllerRef.current?.setCharacters(
      mapping.characters,
    );
  }, [mapping.characters]);

  useEffect(() => {
    setSelectedAgentId("");
    setActionError(null);
    setActionMessage(null);
  }, [selectedDeskId]);

  function selectDesk(deskId: string | null) {
    controllerRef.current?.selectDesk(deskId);
    setSelectedDeskId(deskId);
  }

  async function assignAgent() {
    if (
      !selectedDeskId ||
      !selectedAgentId ||
      savingRef.current ||
      loadingData
    ) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setActionError(null);
    setActionMessage(null);

    try {
      await officeApi.assignDesk(
        selectedDeskId,
        selectedAgentId,
      );

      await loadData();
      setSelectedAgentId("");
      setActionMessage("Đã lưu vị trí bàn làm việc.");
    } catch (error) {
      setActionError(errorMessage(error));
      await loadData();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function unassignAgent() {
    if (
      !selectedDeskId ||
      savingRef.current ||
      loadingData
    ) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setActionError(null);
    setActionMessage(null);

    try {
      await officeApi.unassignDesk(selectedDeskId);
      await loadData();
      setActionMessage("Đã giải phóng bàn làm việc.");
    } catch (error) {
      setActionError(errorMessage(error));
      await loadData();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const selectedDesk = DESKS.find(
    (desk) => desk.id === selectedDeskId,
  );

  const selectedAssignment = selectedDeskId
    ? assignmentByDesk.get(selectedDeskId)
    : undefined;

  const eligibleAgents = agents
    .filter(isOfficeEligible)
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedAgentCurrentDesk = selectedAgentId
    ? deskByAgent.get(selectedAgentId)
    : undefined;

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
              3D · Persistent Desks
            </span>
          </h1>

          <p className="text-sm text-muted-foreground">
            Chọn bàn để phân công nhân viên AI.
            Vị trí được lưu trong database.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={loadingData || saving}
            onClick={() => void loadData()}
          >
            <RefreshCw
              className={`mr-2 size-4 ${
                loadingData ? "animate-spin" : ""
              }`}
            />
            Làm mới
          </Button>

          <Button variant="outline" asChild>
            <Link href="/workforce?tab=agents">
              <Users className="mr-2 size-4" />
              Quản lý nhân viên
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <div className="rounded-lg border bg-card px-4 py-2">
          Nhân viên AI: <strong>{agents.length}</strong>
        </div>

        <div className="rounded-lg border bg-card px-4 py-2">
          Phòng ban: <strong>{departments.length}</strong>
        </div>

        <div className="rounded-lg border bg-card px-4 py-2">
          Có chỗ ngồi:{" "}
          <strong>{mapping.assignments.length}</strong>
          /{DESKS.length}
        </div>

        <div className="rounded-lg border bg-card px-4 py-2">
          Chưa có bàn:{" "}
          <strong>{mapping.unassignedAgents.length}</strong>
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

        <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
          <div className="rounded-lg bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm">
            WORKSPACE · {mapping.assignments.length} Agent
          </div>

          <Button
            size="sm"
            variant="secondary"
            disabled={!ready}
            onClick={() => setShowDeskList((v) => !v)}
          >
            <Monitor className="mr-2 size-4" />
            {showDeskList
              ? "Ẩn danh sách bàn"
              : "Hiện danh sách bàn"}
          </Button>

          {showDeskList && (
            <div className="max-h-[300px] w-[235px] overflow-y-auto rounded-xl border bg-white/95 p-2 shadow-lg">
              <p className="px-2 pb-2 text-xs font-semibold text-slate-500">
                WORKSTATIONS
              </p>

              <div className="space-y-1">
                {DESKS.map((desk) => {
                  const active =
                    selectedDeskId === desk.id;

                  const assignment =
                    assignmentByDesk.get(desk.id);

                  return (
                    <button
                      key={desk.id}
                      type="button"
                      disabled={!ready}
                      onClick={() => selectDesk(desk.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs transition-colors ${
                        active
                          ? "bg-emerald-100 text-emerald-900"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Monitor className="size-3.5 shrink-0" />

                        <span className="min-w-0">
                          <span className="block font-semibold">
                            {deskLabel(desk.id)}
                          </span>

                          <span className="block truncate text-[11px] opacity-70">
                            {assignment?.agent.name ??
                              "Bàn trống"}
                          </span>
                        </span>
                      </span>

                      {active ? (
                        <CheckCircle2 className="size-4 shrink-0" />
                      ) : (
                        <ChevronRight className="size-3.5 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {selectedDesk && (
          <div className="absolute bottom-20 left-4 right-4 z-20 max-h-[70%] overflow-y-auto rounded-xl border bg-white/95 p-4 text-slate-800 shadow-xl backdrop-blur-sm sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:w-[330px]">
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
                <span className="text-slate-500">Mã bàn</span>
                <span className="font-mono font-medium">
                  {selectedDesk.id}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Vị trí</span>
                <span className="font-mono text-xs">
                  X: {selectedDesk.position[0]},
                  Z: {selectedDesk.position[1]}
                </span>
              </div>

              {selectedAssignment ? (
                <>
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-xs text-emerald-700">
                      AI AGENT
                    </p>

                    <p className="mt-1 font-semibold">
                      {selectedAssignment.agent.name}
                    </p>

                    <p className="text-xs text-slate-600">
                      {selectedAssignment.agent.role}
                    </p>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                      Phòng ban
                    </span>
                    <span className="text-right font-medium">
                      {selectedAssignment.departmentName ??
                        "Chưa phân phòng ban"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                      Trạng thái
                    </span>
                    <span className="font-medium">
                      {STATUS_LABELS[
                        selectedAssignment.agent.status
                      ]}
                    </span>
                  </div>

                  {selectedAssignment.agent.description && (
                    <p className="text-xs leading-relaxed text-slate-600">
                      {selectedAssignment.agent.description}
                    </p>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={saving || loadingData}
                    onClick={() => void unassignAgent()}
                  >
                    {saving ? "Đang lưu..." : "Giải phóng bàn"}
                  </Button>
                </>
              ) : (
                <div className="rounded-lg border border-dashed bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <Info className="size-4 text-slate-500" />
                    <span className="font-semibold">
                      Bàn trống
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Chọn một Agent để phân công vào bàn này.
                  </p>
                </div>
              )}

              {!selectedAssignment && (
                <div className="space-y-2 border-t pt-3">
                  <label
                    htmlFor="office-agent-select"
                    className="block text-xs font-semibold"
                  >
                    Phân công nhân viên AI
                  </label>

                  <select
                    id="office-agent-select"
                    value={selectedAgentId}
                    disabled={saving || loadingData}
                    onChange={(event) =>
                      setSelectedAgentId(event.target.value)
                    }
                    className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                  >
                    <option value="">
                      -- Chọn AI Agent --
                    </option>

                    {eligibleAgents.map((agent) => {
                      const currentDesk =
                        deskByAgent.get(agent.id);

                      return (
                        <option
                          key={agent.id}
                          value={agent.id}
                        >
                          {agent.name}
                          {currentDesk
                            ? ` (đang ở ${deskLabel(currentDesk)})`
                            : " (chưa có bàn)"}
                        </option>
                      );
                    })}
                  </select>

                  {selectedAgentCurrentDesk && (
                    <p className="text-xs text-amber-700">
                      Agent sẽ được chuyển từ{" "}
                      {deskLabel(selectedAgentCurrentDesk)}
                      {" "}sang bàn này.
                    </p>
                  )}

                  <Button
                    className="w-full"
                    disabled={
                      !selectedAgentId ||
                      saving ||
                      loadingData
                    }
                    onClick={() => void assignAgent()}
                  >
                    {saving
                      ? "Đang lưu..."
                      : "Gán Agent vào bàn"}
                  </Button>
                </div>
              )}

              {actionError && (
                <p
                  role="alert"
                  className="rounded-md bg-red-50 p-2 text-xs text-red-700"
                >
                  {actionError}
                </p>
              )}

              {actionMessage && (
                <p
                  role="status"
                  className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700"
                >
                  {actionMessage}
                </p>
              )}

              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <Link href="/workforce?tab=agents">
                  <Users className="mr-2 size-4" />
                  Quản lý AI Agent
                </Link>
              </Button>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 z-10 flex gap-2">
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
        Office V0.7 — Vị trí bàn được lưu trong PostgreSQL.
        Trạng thái nhân vật phản ánh cấu hình Agent,
        chưa phải trạng thái thực thi từ worker.
      </p>
    </div>
  );
}
