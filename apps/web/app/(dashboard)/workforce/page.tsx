"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { AgentStatusBadge } from "@/modules/workforce/agent-status-badge";
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
  workforceApi,
  type AiAgent,
  type AgentCategory,
  type AgentTemplate,
  type Department,
  type UpdateDepartmentInput,
} from "@/lib/workforce-api";
import { crudToast } from "@/lib/crud-messages";
import { useUiLanguage } from "@/lib/ui-language";
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";

import { AgentFormDialog } from "@/modules/workforce/agent-form-dialog";
import { TemplateFormDialog } from "@/modules/workforce/template-form-dialog";
import { CreateAgentFromTemplateDialog } from "@/modules/workforce/create-agent-from-template-dialog";
import { DepartmentCard } from "@/modules/workforce/department-card";
import { CreateDepartmentDialog } from "@/modules/workforce/create-department-dialog";

type Tab = "agents" | "departments" | "templates";

const categories: Record<AgentCategory, string> = {
  marketing: "Marketing",
  sales: "Kinh doanh",
  support: "Chăm sóc khách hàng",
  research: "Nghiên cứu",
  operations: "Vận hành",
  other: "Khác",
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Vui lòng thử lại.";
}

export default function WorkforcePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useUiLanguage();

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

  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [templateSearch, setTemplateSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AiAgent | null>(null);
  const [deleteAgentTarget, setDeleteAgentTarget] = useState<AiAgent | null>(
    null,
  );

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AgentTemplate | null>(
    null,
  );
  const [deleteTemplateTarget, setDeleteTemplateTarget] =
    useState<AgentTemplate | null>(null);

  const [createFromTemplateOpen, setCreateFromTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<AgentTemplate | null>(null);

  const [departmentFormOpen, setDepartmentFormOpen] = useState(false);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentDescription, setDepartmentDescription] = useState("");
  const [deleteDepartmentTarget, setDeleteDepartmentTarget] =
    useState<Department | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [agentData, departmentData, templateData] = await Promise.all([
        workforceApi.listAgents(),
        workforceApi.listDepartments(),
        workforceApi.listTemplates(),
      ]);

      setAgents(agentData);
      setDepartments(departmentData);
      setTemplates(templateData);
    } catch (error) {
      toast.error(
        language === "vi" ? "Không thể tải dữ liệu." : "Failed to load data.",
        { description: errorMessage(error) },
      );
    } finally {
      setLoading(false);
    }
  }, [language]);

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
        : agents.filter((agent) => agent.departmentId === departmentFilter),
    [agents, departmentFilter],
  );

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();

    return templates.filter((template) => {
      if (categoryFilter !== "all" && template.category !== categoryFilter) {
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
        departments.map((department) => [department.id, department.name]),
      ),
    [departments],
  );

  const departmentEmployeeCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const agent of agents) {
      if (!agent.departmentId) continue;

      counts.set(agent.departmentId, (counts.get(agent.departmentId) ?? 0) + 1);
    }

    return counts;
  }, [agents]);

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
    if (!deleteAgentTarget || busy) return;

    setBusy(true);

    try {
      await workforceApi.deleteAgent(deleteAgentTarget.id);

      crudToast.success("delete", "agent", { language });

      setDeleteAgentTarget(null);
      await refresh();
    } catch (error) {
      crudToast.error("delete", "agent", {
        language,
        description: errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }

  async function removeTemplate() {
    if (!deleteTemplateTarget || busy) return;

    setBusy(true);

    try {
      await workforceApi.deleteTemplate(deleteTemplateTarget.id);

      crudToast.success("delete", "agentTemplate", {
        language,
      });

      setDeleteTemplateTarget(null);
      await refresh();
    } catch (error) {
      crudToast.error("delete", "agentTemplate", {
        language,
        description:
          language === "vi"
            ? `${errorMessage(error)} Mẫu đang được Agent sử dụng sẽ không thể xóa.`
            : errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }

  async function updateDepartment(
    id: string,
    input: UpdateDepartmentInput,
  ): Promise<void> {
    if (busy) {
      throw new Error(
        language === "vi"
          ? "Đang có thao tác khác."
          : "Another operation is in progress.",
      );
    }

    setBusy(true);

    try {
      await workforceApi.updateDepartment(id, input);

      crudToast.success("update", "department", {
        language,
      });

      await refresh();
    } catch (error) {
      crudToast.error("update", "department", {
        language,
        description: errorMessage(error),
      });

      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function removeDepartment(): Promise<void> {
    if (!deleteDepartmentTarget || busy) return;

    const department = deleteDepartmentTarget;
    const employeeCount = departmentEmployeeCounts.get(department.id) ?? 0;

    if (employeeCount > 0) {
      toast.error(
        language === "vi"
          ? "Không thể xóa phòng ban đang có nhân viên."
          : "Cannot delete a department with assigned employees.",
      );
      return;
    }

    setBusy(true);

    try {
      await workforceApi.deleteDepartment(department.id);

      crudToast.success("delete", "department", {
        language,
      });

      setDeleteDepartmentTarget(null);

      if (departmentFilter === department.id) {
        setDepartmentFilter("all");
      }

      await refresh();
    } catch (error) {
      crudToast.error("delete", "department", {
        language,
        description: errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }

  async function addDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    const name = departmentName.trim();
    const slug = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!name || !slug) {
      toast.error(
        language === "vi"
          ? "Tên phòng ban không hợp lệ."
          : "Invalid department name.",
      );
      return;
    }

    setBusy(true);

    try {
      await workforceApi.createDepartment({
        name,
        slug,
        description: departmentDescription.trim(),
      });

      crudToast.success("create", "department", {
        language,
      });

      setDepartmentName("");
      setDepartmentDescription("");
      setDepartmentFormOpen(false);

      await refresh();
    } catch (error) {
      crudToast.error("create", "department", {
        language,
        description: errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }

  const tabLabels: Record<Tab, string> = {
    agents: "Nhân viên AI",
    departments: "Phòng ban",
    templates: "Template",
  };

  return (
    <div className="w-full min-w-0 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Đội ngũ AI</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý nhân viên AI, phòng ban và các mẫu nhân viên chuyên môn.
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
              className={`size-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Làm mới
          </Button>

          <Button
            type="button"
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
            value: agents.filter((agent) => agent.status === "active").length,
            icon: Users,
          },
          {
            label: "Phòng ban",
            value: departments.length,
            icon: Building2,
          },
          {
            label: "Templates",
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
              <p className="text-2xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b">
          <div className="flex flex-wrap gap-1">
            {(["agents", "departments", "templates"] as Tab[]).map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={tab === item ? "default" : "ghost"}
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
                <SelectItem value="all">Tất cả phòng ban</SelectItem>

                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
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
                  onChange={(event) => setTemplateSearch(event.target.value)}
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[190px]">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">Tất cả chuyên môn</SelectItem>

                  {(Object.keys(categories) as AgentCategory[]).map(
                    (category) => (
                      <SelectItem key={category} value={category}>
                        {categories[category]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
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
                        <p className="truncate font-medium">{agent.name}</p>

                        <p className="truncate text-sm text-muted-foreground">
                          {agent.role}
                        </p>

                        <p className="break-all text-xs text-muted-foreground">
                          {departmentNames.get(agent.departmentId ?? "") ??
                            "Chưa phân phòng"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="secondary">{agent.role}</Badge>
                          {agent.toolConfig.enabledTools.length > 0 ? agent.toolConfig.enabledTools.map((tool) => (
                            <Badge key={tool} variant="outline">{tool === "web_research" ? "Nghiên cứu Internet" : tool}</Badge>
                          )) : <Badge variant="outline">Chưa có công cụ</Badge>}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                     <AgentStatusBadge status={agent.status} />
                      {agent.status === "active" ? (
                        <Button type="button" size="sm" asChild>
                          <Link href={`/tasks?agentId=${encodeURIComponent(agent.id)}`}>Giao việc</Link>
                        </Button>
                      ) : (
                        <Button type="button" size="sm" variant="outline" disabled title="Chỉ nhân viên đang hoạt động mới nhận việc">
                          Chưa sẵn sàng
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="edit"
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
                        variant="delete"
                        size="icon"
                        disabled={busy}
                        aria-label={`Xóa ${agent.name}`}
                        onClick={() => setDeleteAgentTarget(agent)}
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
                  <DepartmentCard
                    key={department.id}
                    department={department}
                    employeeCount={
                      departmentEmployeeCounts.get(department.id) ?? 0
                    }
                    busy={busy}
                    onUpdate={updateDepartment}
                    onDelete={setDeleteDepartmentTarget}
                  />
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
                const isGlobal = template.organizationId === null;

                const usedCount = agents.filter(
                  (agent) => agent.templateId === template.id,
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

                      <Badge variant="outline" className="text-foreground">
                        {isGlobal ? "Mẫu hệ thống" : "Mẫu của tổ chức"}
                      </Badge>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{template.name}</h3>

                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {template.slug}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {categories[template.category]}
                        </Badge>

                        <Badge variant="outline">v{template.version}</Badge>

                        {template.isPublished && (
                          <Badge variant="outline">Đã xuất bản</Badge>
                        )}
                      </div>

                      <p className="mt-4 text-sm text-muted-foreground">
                        {template.description || "Chưa có mô tả nhiệm vụ."}
                      </p>

                      <p className="mt-4 text-xs text-muted-foreground">
                        {usedCount} nhân viên đang sử dụng
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t pt-4">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        onClick={() => openTemplateAgent(template)}
                      >
                        <CirclePlus className="size-4" />
                        Tạo nhân viên
                      </Button>

                      {!isGlobal && (
                        <>
                          <Button
                            type="button"
                            variant="edit"
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
                            variant="delete"
                            size="icon"
                            disabled={busy || usedCount > 0}
                            aria-label={`Xóa mẫu ${template.name}`}
                            title={
                              usedCount > 0
                                ? "Mẫu đang được nhân viên sử dụng"
                                : "Xóa mẫu"
                            }
                            onClick={() => setDeleteTemplateTarget(template)}
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
                <Button type="button" onClick={openCreateTemplate}>
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

      <ConfirmDeleteDialog
        open={deleteAgentTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteAgentTarget(null);
          }
        }}
        itemName={deleteAgentTarget?.name}
        description={
          language === "vi"
            ? "Bạn có chắc muốn xóa nhân viên AI này? Hành động này không thể hoàn tác."
            : "Are you sure you want to delete this AI agent? This action cannot be undone."
        }
        loading={busy}
        onConfirm={removeAgent}
      />

      <ConfirmDeleteDialog
        open={deleteTemplateTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTemplateTarget(null);
          }
        }}
        itemName={deleteTemplateTarget?.name}
        description={
          language === "vi"
            ? "Bạn có chắc muốn xóa mẫu này? Mẫu đang được nhân viên sử dụng sẽ không thể xóa."
            : "Are you sure you want to delete this template? Templates currently in use cannot be deleted."
        }
        loading={busy}
        onConfirm={removeTemplate}
      />

      <ConfirmDeleteDialog
        open={deleteDepartmentTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDepartmentTarget(null);
          }
        }}
        itemName={deleteDepartmentTarget?.name}
        description={
          language === "vi"
            ? "Bạn có chắc muốn xóa phòng ban này? Hành động này không thể hoàn tác."
            : "Are you sure you want to delete this department? This action cannot be undone."
        }
        loading={busy}
        onConfirm={removeDepartment}
      />
      <CreateDepartmentDialog
        open={departmentFormOpen}
        onOpenChange={setDepartmentFormOpen}
        onCreated={refresh}
      />
    </div>
  );
}
