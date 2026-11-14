"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Info,
  RefreshCw,
  Users,
  X,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";

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
import { tasksApi } from "@/lib/tasks-api";

import { OFFICE_LAYOUT } from "@/modules/office/config/office-layout";

import {
  isOfficeEligible,
  mapAgentsToOffice,
} from "@/modules/office/config/office-agent-mapping";

import { OfficeShell } from "@/modules/office/components/office-shell";
import { OfficeWorkstationList } from "@/modules/office/components/office-workstation-list";

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
  const router = useRouter();
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
  const [taskAgent, setTaskAgent] = useState<AiAgent | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

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
      const [
        nextAgents,
        nextDepartments,
        nextAssignments,
      ] = await Promise.all([
        workforceApi.listAgents(),
        workforceApi.listDepartments(),
        officeApi.listAssignments(),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setAgents(nextAgents);
      setDepartments(nextDepartments);
      setSavedAssignments(nextAssignments);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

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

  async function createAgentTask(event: React.FormEvent) {
    event.preventDefault();
    if (!taskAgent || !taskTitle.trim() || !taskDescription.trim()) {
      setTaskError("Nhập tiêu đề và mô tả nhiệm vụ.");
      return;
    }
    setCreatingTask(true);
    setTaskError(null);
    try {
      const task = await tasksApi.create({ title: taskTitle, description: taskDescription, agentId: taskAgent.id });
      setTaskAgent(null);
      setTaskTitle("");
      setTaskDescription("");
      router.push(`/tasks/${task.id}`);
    } catch (error) {
      setTaskError(errorMessage(error));
    } finally {
      setCreatingTask(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full min-w-0 flex-col gap-3 p-3 md:p-4">
      {/* OFFICE HEADER & TOOLBAR */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </div>

          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">
              Văn phòng AI
            </h1>

            <p className="text-xs text-muted-foreground">
              Không gian làm việc của đội ngũ nhân viên AI
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-xs">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">
              Nhân viên
            </span>
            <strong>{agents.length}</strong>
          </div>

          <div className="rounded-full border bg-background/70 px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">
              Đã có bàn{" "}
            </span>
            <strong>
              {mapping.assignments.length}/{DESKS.length}
            </strong>
          </div>

          <div className="rounded-full border bg-background/70 px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">
              Chưa có bàn{" "}
            </span>
            <strong>
              {mapping.unassignedAgents.length}
            </strong>
          </div>

          <Button
            size="sm"
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

          <Button
            size="sm"
            variant="outline"
            asChild
          >
            <Link href="/workforce?tab=agents">
              <Users className="mr-2 size-4" />
              Nhân viên
            </Link>
          </Button>
        </div>
      </div>

      {/* DATA ERRORS */}
      {dataError && (
        <p
          role="alert"
          className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm"
        >
          {dataError}
        </p>
      )}

      {/* OFFICE SHELL: canvas 3D + sidebar + panel chi tiết + camera */}
      <OfficeShell
        mountRef={mountRef}
        ready={ready}
        sceneError={sceneError}
        onZoomIn={() => controllerRef.current?.zoom(1.25)}
        onZoomOut={() => controllerRef.current?.zoom(0.8)}
        onResetView={() => controllerRef.current?.reset()}
        sidebar={
          <OfficeWorkstationList
            desks={DESKS}
            assignmentByDesk={assignmentByDesk}
            selectedDeskId={selectedDeskId}
            getDeskLabel={deskLabel}
            onSelectDesk={selectDesk}
            disabled={!ready}
          />
        }
        details={
          selectedDesk ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Bàn đang chọn
                  </p>

                  <h2 className="mt-1 text-lg font-bold">
                    {deskLabel(selectedDesk.id)}
                  </h2>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  aria-label="Đóng thông tin bàn"
                  onClick={() => selectDesk(null)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    Mã bàn
                  </span>

                  <span className="font-mono font-medium">
                    {selectedDesk.id}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    Vị trí
                  </span>

                  <span className="font-mono text-xs">
                    X: {selectedDesk.position[0]},
                    Z: {selectedDesk.position[1]}
                  </span>
                </div>

                {selectedAssignment ? (
                  <>
                    <div className="rounded-lg bg-primary/10 p-3">
                      <p className="text-xs text-primary">
                        AI AGENT
                      </p>

                      <p className="mt-1 break-words font-semibold">
                        {selectedAssignment.agent.name}
                      </p>

                      <p className="break-words text-xs text-muted-foreground">
                        {selectedAssignment.agent.role}
                      </p>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        Phòng ban
                      </span>

                      <span className="text-right font-medium">
                        {selectedAssignment.departmentName ??
                          "Chưa phân phòng ban"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        Trạng thái
                      </span>

                      <span className="font-medium">
                        {
                          STATUS_LABELS[
                            selectedAssignment.agent.status
                          ]
                        }
                      </span>
                    </div>

                    {selectedAssignment.agent.description && (
                      <p className="break-words text-xs leading-relaxed text-muted-foreground">
                        {selectedAssignment.agent.description}
                      </p>
                    )}

                    {selectedAssignment.agent.status === "active" ? (
                      <Button className="w-full" disabled={loadingData} onClick={() => { setTaskError(null); setTaskAgent(selectedAssignment.agent); }}>
                        Giao nhiệm vụ
                      </Button>
                    ) : (
                      <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                        Chỉ Agent đang kích hoạt mới nhận được nhiệm vụ.
                      </p>
                    )}

                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={saving || loadingData}
                      onClick={() => void unassignAgent()}
                    >
                      {saving
                        ? "Đang lưu..."
                        : "Giải phóng bàn"}
                    </Button>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
                    <div className="flex items-center gap-2">
                      <Info className="size-4 text-muted-foreground" />

                      <span className="font-semibold">
                        Bàn trống
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      Chọn một Agent để phân công vào bàn này.
                    </p>
                  </div>
                )}

                {!selectedAssignment && (
                  <div className="space-y-2 border-t border-border/60 pt-3">
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
                        setSelectedAgentId(
                          event.target.value,
                        )
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
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
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Agent sẽ được chuyển từ{" "}
                        {deskLabel(
                          selectedAgentCurrentDesk,
                        )}{" "}
                        sang bàn này.
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
                    className="rounded-md bg-destructive/10 p-2 text-xs text-destructive"
                  >
                    {actionError}
                  </p>
                )}

                {actionMessage && (
                  <p
                    role="status"
                    className="rounded-md bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-400"
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
            </>
          ) : null
        }
      />
      <Dialog open={taskAgent !== null} onOpenChange={(open) => !creatingTask && !open && setTaskAgent(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Giao nhiệm vụ cho {taskAgent?.name}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={createAgentTask}>
            <p className="text-sm text-muted-foreground">Nhân viên sử dụng cấu hình đã chốt khi nhận việc và tự quyết định khi nào cần tham khảo nguồn công khai.</p>
            <Input autoFocus maxLength={200} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Tiêu đề nhiệm vụ" aria-label="Tiêu đề nhiệm vụ" />
            <Textarea maxLength={12000} rows={6} value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} placeholder="Mô tả yêu cầu cần thực hiện" aria-label="Mô tả nhiệm vụ" />
            {taskError && <p role="alert" className="text-sm text-destructive">{taskError}</p>}
            <DialogFooter><Button type="button" variant="outline" disabled={creatingTask} onClick={() => setTaskAgent(null)}>Hủy</Button><Button disabled={creatingTask}>{creatingTask ? "Đang giao việc..." : "Giao việc"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
