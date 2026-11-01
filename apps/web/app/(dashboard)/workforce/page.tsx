
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Bot,
  Building2,
  CirclePlus,
  Layers3,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardContent,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";

import {
  workforceApi,
  type AiAgent,
  type AgentCategory,
  type AgentTemplate,
  type Department,
} from "@/lib/workforce-api";

import { AgentFormDialog } from "@/modules/workforce/agent-form-dialog";
import { TemplateFormDialog } from "@/modules/workforce/template-form-dialog";
import { CreateAgentFromTemplateDialog } from "@/modules/workforce/create-agent-from-template-dialog";

type Tab = "agents" | "departments" | "templates";

const primary =
  "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";

const categories: Record<AgentCategory, string> = {
  marketing: "Marketing",
  sales: "Kinh doanh",
  support: "Chăm sóc khách hàng",
  research: "Nghiên cứu",
  operations: "Vận hành",
  other: "Khác",
};

const statuses: Record<AiAgent["status"], string> = {
  draft: "Bản nháp",
  active: "Đang hoạt động",
  paused: "Tạm dừng",
  archived: "Đã lưu trữ",
};

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Vui lòng thử lại.";
}

export default function WorkforcePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryTab = searchParams.get("tab");
  const tab: Tab =
    queryTab === "departments" || queryTab === "templates"
      ? queryTab
      : "agents";

  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [departmentFilter, setDepartmentFilter] =
    useState("all");

  const [templateSearch, setTemplateSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("all");

  const [agentDialogOpen, setAgentDialogOpen] =
    useState(false);
  const [editingAgent, setEditingAgent] =
    useState<AiAgent | null>(null);
  const [deleteAgentTarget, setDeleteAgentTarget] =
    useState<AiAgent | null>(null);

  const [templateDialogOpen, setTemplateDialogOpen] =
    useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<AgentTemplate | null>(null);
  const [deleteTemplateTarget, setDeleteTemplateTarget] =
    useState<AgentTemplate | null>(null);

  const [createFromTemplateOpen, setCreateFromTemplateOpen] =
    useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<AgentTemplate | null>(null);

  const [departmentFormOpen, setDepartmentFormOpen] =
    useState(false);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentDescription, setDepartmentDescription] =
    useState("");

  const refresh = useCallback(async () => {
    try {
      const [agentData, departmentData, templateData] =
        await Promise.all([
          workforceApi.listAgents(),
          workforceApi.listDepartments(),
          workforceApi.listTemplates(),
        ]);

      setAgents(agentData);
      setDepartments(departmentData);
      setTemplates(templateData);
    } catch (error) {
      toast.error("Không thể tải dữ liệu.", {
        description: errorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function manualRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  const filteredAgents = useMemo(
    () =>
      departmentFilter === "all"
        ? agents
        : agents.filter(
            (agent) =>
              agent.departmentId === departmentFilter,
          ),
    [agents, departmentFilter],
  );

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();

    return templates.filter((template) => {
      if (
        categoryFilter !== "all" &&
        template.category !== categoryFilter
      ) {
        return false;
      }

      if (!query) return true;

      return [
        template.name,
        template.slug,
        template.description ?? "",
        categories[template.category],
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [templates, templateSearch, categoryFilter]);

  const departmentNames = useMemo(
    () =>
      new Map(
        departments.map((department) => [
          department.id,
          department.name,
        ]),
      ),
    [departments],
  );

  function switchTab(next: Tab) {
    router.push(`/workforce?tab=${next}`);
  }

  function openCreateAgent() {
    setEditingAgent(null);
    setAgentDialogOpen(true);
  }

  function openCreateTemplate() {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  }

  function openTemplateAgent(template: AgentTemplate) {
    setSelectedTemplate(template);
    setCreateFromTemplateOpen(true);
  }

  async function removeAgent() {
    if (!deleteAgentTarget) return;

    setBusy(true);

    try {
      await workforceApi.deleteAgent(
        deleteAgentTarget.id,
      );

      toast.success("Đã xóa nhân viên AI.");
      setDeleteAgentTarget(null);
      await refresh();
    } catch (error) {
      toast.error("Không thể xóa nhân viên.", {
        description: errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }

  async function removeTemplate() {
    if (!deleteTemplateTarget) return;

    setBusy(true);

    try {
      await workforceApi.deleteTemplate(
        deleteTemplateTarget.id,
      );

      toast.success("Đã xóa mẫu nhân viên.");
      setDeleteTemplateTarget(null);
      await refresh();
    } catch (error) {
      toast.error("Không thể xóa mẫu nhân viên.", {
        description: `${errorMessage(error)} Mẫu đang được Agent sử dụng sẽ không thể xóa.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function addDepartment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const name = departmentName.trim();
    const slug = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!name || !slug) {
      toast.error("Tên phòng ban không hợp lệ.");
      return;
    }

    setBusy(true);

    try {
      await workforceApi.createDepartment({
        name,
        slug,
        description: departmentDescription.trim(),
      });

      toast.success("Đã tạo phòng ban.");
      setDepartmentName("");
      setDepartmentDescription("");
      setDepartmentFormOpen(false);
      await refresh();
    } catch (error) {
      toast.error("Không thể tạo phòng ban.", {
        description: errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }

  const tabLabels: Record<Tab, string> = {
    agents: "Nhân viên AI",
    departments: "Phòng ban",
    templates: "Mẫu nhân viên",
  };

  return (
    <div className="w-full min-w-0 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Đội ngũ AI
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý nhân viên AI, phòng ban và các mẫu
            nhân viên chuyên môn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={refreshing}
            onClick={() => void manualRefresh()}
          >
            <RefreshCw
              className={`size-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Làm mới
          </Button>

          <Button
            type="button"
            className={primary}
            onClick={
              tab === "templates"
                ? openCreateTemplate
                : tab === "departments"
                  ? () => setDepartmentFormOpen(true)
                  : openCreateAgent
            }
          >
            <CirclePlus className="size-4" />
            {tab === "templates"
              ? "Tạo mẫu"
              : tab === "departments"
                ? "Tạo phòng ban"
                : "Tạo nhân viên"}
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tổng nhân viên",
            value: agents.length,
            icon: Bot,
          },
          {
            label: "Đang hoạt động",
            value: agents.filter(
              (agent) => agent.status === "active",
            ).length,
            icon: Users,
          },
          {
            label: "Phòng ban",
            value: departments.length,
            icon: Building2,
          },
          {
            label: "Mẫu nhân viên",
            value: templates.length,
            icon: Layers3,
          },
        ].map((stat) => (
          <Card key={stat.label} className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
              <CardTitle className="min-w-0 text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>

              <stat.icon className="size-4 shrink-0 text-muted-foreground" />
            </CardHeader>

            <CardContent>
              <p className="text-2xl font-semibold">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b">
          <div className="flex flex-wrap gap-1">
            {(
              [
                "agents",
                "departments",
                "templates",
              ] as Tab[]
            ).map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={
                  tab === item ? "default" : "ghost"
                }
                className={
                  tab === item ? primary : ""
                }
                onClick={() => switchTab(item)}
              >
                {tabLabels[item]}
              </Button>
            ))}
          </div>

          {tab === "agents" && (
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  Tất cả phòng ban
                </SelectItem>

                {departments.map((department) => (
                  <SelectItem
                    key={department.id}
                    value={department.id}
                  >
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {tab === "templates" && (
            <div className="flex w-full flex-wrap gap-2 lg:w-auto">
              <div className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />

                <Input
                  aria-label="Tìm mẫu nhân viên"
                  className="pl-9"
                  placeholder="Tìm mẫu nhân viên..."
                  value={templateSearch}
                  onChange={(event) =>
                    setTemplateSearch(event.target.value)
                  }
                />
              </div>

              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger className="w-full sm:w-[190px]">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    Tất cả chuyên môn
                  </SelectItem>

                  {(
                    Object.keys(categories) as AgentCategory[]
                  ).map((category) => (
                    <SelectItem
                      key={category}
                      value={category}
                    >
                      {categories[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {tab === "departments" && departmentFormOpen && (
            <form
              onSubmit={(event) =>
                void addDepartment(event)
              }
              className="grid gap-3 border-b p-5 sm:grid-cols-2"
            >
              <Input
                required
                maxLength={120}
                placeholder="Tên phòng ban"
                value={departmentName}
                onChange={(event) =>
                  setDepartmentName(event.target.value)
                }
              />

              <Input
                maxLength={2000}
                placeholder="Mô tả phòng ban"
                value={departmentDescription}
                onChange={(event) =>
                  setDepartmentDescription(
                    event.target.value,
                  )
                }
              />

              <div className="flex gap-2 sm:col-span-2">
                <Button
                  type="submit"
                  disabled={busy}
                  className={primary}
                >
                  {busy && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Tạo phòng ban
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    setDepartmentFormOpen(false)
                  }
                >
                  Hủy
                </Button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Đang tải dữ liệu...
            </div>
          ) : tab === "agents" ? (
            filteredAgents.length > 0 ? (
              <div className="divide-y">
                {filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="shrink-0 rounded-lg border p-3">
                        <Bot className="size-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {agent.name}
                        </p>

                        <p className="truncate text-sm text-muted-foreground">
                          {agent.role}
                        </p>

                        <p className="break-all text-xs text-muted-foreground">
                          {departmentNames.get(
                            agent.departmentId ?? "",
                          ) ?? "Chưa phân phòng"}
                          {" · "}
                          {agent.modelId ?? "Chưa chọn model"}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-foreground"
                      >
                        {statuses[agent.status]}
                      </Badge>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Sửa ${agent.name}`}
                        onClick={() => {
                          setEditingAgent(agent);
                          setAgentDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={busy}
                        aria-label={`Xóa ${agent.name}`}
                        onClick={() =>
                          setDeleteAgentTarget(agent)
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Chưa có nhân viên AI.
              </div>
            )
          ) : tab === "departments" ? (
            departments.length > 0 ? (
              <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                {departments.map((department) => (
                  <div
                    key={department.id}
                    className="min-w-0 rounded-lg border p-5"
                  >
                    <p className="font-medium">
                      {department.name}
                    </p>

                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {department.slug}
                    </p>

                    <p className="mt-3 text-sm text-muted-foreground">
                      {department.description ||
                        "Chưa có mô tả"}
                    </p>

                    <p className="mt-4 text-xs">
                      {
                        agents.filter(
                          (agent) =>
                            agent.departmentId ===
                            department.id,
                        ).length
                      }{" "}
                      nhân viên
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Chưa có phòng ban.
              </div>
            )
          ) : filteredTemplates.length > 0 ? (
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((template) => {
                const isGlobal =
                  template.organizationId === null;

                const usedCount = agents.filter(
                  (agent) =>
                    agent.templateId === template.id,
                ).length;

                return (
                  <div
                    key={template.id}
                    className="flex min-w-0 flex-col gap-4 rounded-xl border p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/30">
                        <Layers3 className="size-5" />
                      </div>

                      <Badge
                        variant="outline"
                        className="text-foreground"
                      >
                        {isGlobal
                          ? "Mẫu hệ thống"
                          : "Mẫu của tổ chức"}
                      </Badge>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">
                        {template.name}
                      </h3>

                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {template.slug}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {categories[template.category]}
                        </Badge>

                        <Badge variant="outline">
                          v{template.version}
                        </Badge>

                        {template.isPublished && (
                          <Badge variant="outline">
                            Đã xuất bản
                          </Badge>
                        )}
                      </div>

                      <p className="mt-4 text-sm text-muted-foreground">
                        {template.description ||
                          "Chưa có mô tả nhiệm vụ."}
                      </p>

                      <p className="mt-4 text-xs text-muted-foreground">
                        {usedCount} nhân viên đang sử dụng
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t pt-4">
                      <Button
                        type="button"
                        size="sm"
                        className={`${primary} flex-1`}
                        onClick={() =>
                          openTemplateAgent(template)
                        }
                      >
                        <CirclePlus className="size-4" />
                        Tạo nhân viên
                      </Button>

                      {!isGlobal && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={`Sửa mẫu ${template.name}`}
                            onClick={() => {
                              setEditingTemplate(template);
                              setTemplateDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={busy || usedCount > 0}
                            aria-label={`Xóa mẫu ${template.name}`}
                            title={
                              usedCount > 0
                                ? "Mẫu đang được nhân viên sử dụng"
                                : "Xóa mẫu"
                            }
                            onClick={() =>
                              setDeleteTemplateTarget(
                                template,
                              )
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 p-12 text-center">
              <Layers3 className="mx-auto size-9 text-muted-foreground" />

              <p className="text-sm text-muted-foreground">
                {templates.length === 0
                  ? "Chưa có mẫu nhân viên AI."
                  : "Không tìm thấy mẫu phù hợp."}
              </p>

              {templates.length === 0 && (
                <Button
                  type="button"
                  className={primary}
                  onClick={openCreateTemplate}
                >
                  <CirclePlus className="size-4" />
                  Tạo mẫu đầu tiên
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AgentFormDialog
        open={agentDialogOpen}
        onOpenChange={setAgentDialogOpen}
        agent={editingAgent}
        departments={departments}
        onSaved={refresh}
      />

      <TemplateFormDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        template={editingTemplate}
        onSaved={refresh}
      />

      <CreateAgentFromTemplateDialog
        open={createFromTemplateOpen}
        onOpenChange={setCreateFromTemplateOpen}
        template={selectedTemplate}
        departments={departments}
        onCreated={async () => {
          await refresh();
          switchTab("agents");
        }}
      />

      <AlertDialog
        open={deleteAgentTarget !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setDeleteAgentTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Xóa nhân viên AI?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa{" "}
              {deleteAgentTarget?.name}? Hành động này
              không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              Hủy
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={busy}
              className={primary}
              onClick={(event) => {
                event.preventDefault();
                void removeAgent();
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

      <AlertDialog
        open={deleteTemplateTarget !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setDeleteTemplateTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Xóa mẫu nhân viên?
            </AlertDialogTitle>

            <AlertDialogDescription>
              Bạn có chắc muốn xóa mẫu{" "}
              {deleteTemplateTarget?.name}? Mẫu đang
              được nhân viên sử dụng sẽ không thể xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              Hủy
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={busy}
              className={primary}
              onClick={(event) => {
                event.preventDefault();
                void removeTemplate();
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
