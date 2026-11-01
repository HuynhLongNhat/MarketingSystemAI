
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

import { useUiLanguage } from "@/lib/ui-language";
import {
  workforceApi,
  type AiAgent,
  type AgentTemplate,
  type Department,
} from "@/lib/workforce-api";
import { AgentFormDialog } from "@/modules/workforce/agent-form-dialog";

type Tab = "agents" | "departments" | "templates";

const primary =
  "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";

export default function WorkforcePage() {
  const { t, language, setLanguage } = useUiLanguage();
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
  const [busy, setBusy] = useState(false);
  const [departmentFilter, setDepartmentFilter] =
    useState("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] =
    useState<AiAgent | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<AiAgent | null>(null);

  const [departmentName, setDepartmentName] = useState("");
  const [departmentDescription, setDepartmentDescription] =
    useState("");
  const [departmentFormOpen, setDepartmentFormOpen] =
    useState(false);

  const refresh = useCallback(async () => {
    try {
      const [a, d, p] = await Promise.all([
        workforceApi.listAgents(),
        workforceApi.listDepartments(),
        workforceApi.listTemplates(),
      ]);

      setAgents(a);
      setDepartments(d);
      setTemplates(p);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      departmentFilter === "all"
        ? agents
        : agents.filter(
            (a) => a.departmentId === departmentFilter,
          ),
    [agents, departmentFilter],
  );

  const departmentNames = useMemo(
    () =>
      new Map(
        departments.map((d) => [d.id, d.name]),
      ),
    [departments],
  );

  const switchTab = (next: Tab) =>
    router.push(`/workforce?tab=${next}`);

  const openCreate = () => {
    setEditingAgent(null);
    setEditorOpen(true);
  };

  async function removeAgent() {
    if (!deleteTarget) return;

    setBusy(true);

    try {
      await workforceApi.deleteAgent(deleteTarget.id);
      toast.success(t.deleted);
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      toast.error(t.failed, {
        description:
          error instanceof Error
            ? error.message
            : undefined,
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

    if (!name || !slug) return;

    setBusy(true);

    try {
      await workforceApi.createDepartment({
        name,
        slug,
        description: departmentDescription.trim(),
      });

      toast.success(t.departmentCreated);
      setDepartmentName("");
      setDepartmentDescription("");
      setDepartmentFormOpen(false);
      await refresh();
    } catch (error) {
      toast.error(t.failed, {
        description:
          error instanceof Error
            ? error.message
            : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function createFromTemplate(
    template: AgentTemplate,
  ) {
    setBusy(true);

    try {
      await workforceApi.createAgentFromTemplate(
        template.id,
        {},
      );

      toast.success(t.templateCreated);
      await refresh();
      switchTab("agents");
    } catch (error) {
      toast.error(t.failed, {
        description:
          error instanceof Error
            ? error.message
            : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.workforce}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={language}
            onValueChange={(v) =>
              setLanguage(v as "vi" | "en")
            }
          >
            <SelectTrigger
              aria-label={t.language}
              className="w-[100px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vi">
                Tiếng Việt
              </SelectItem>
              <SelectItem value="en">
                English
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => void refresh()}
          >
            <RefreshCw className="size-4" />
            <span className="hidden sm:inline">
              {t.reload}
            </span>
          </Button>

          <Button
            className={primary}
            onClick={openCreate}
          >
            <CirclePlus className="size-4" />
            {t.createAgent}
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: t.total,
            value: agents.length,
            icon: Bot,
          },
          {
            label: t.active,
            value: agents.filter(
              (a) => a.status === "active",
            ).length,
            icon: Users,
          },
          {
            label: t.departments,
            value: departments.length,
            icon: Building2,
          },
          {
            label: t.templates,
            value: templates.length,
            icon: Layers3,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {stat.value}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
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
                size="sm"
                variant={
                  tab === item ? "default" : "ghost"
                }
                className={
                  tab === item ? primary : ""
                }
                onClick={() => switchTab(item)}
              >
                {t[item]}
              </Button>
            ))}
          </div>

          {tab === "agents" && (
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t.filterAll}
                </SelectItem>
                {departments.map((d) => (
                  <SelectItem
                    key={d.id}
                    value={d.id}
                  >
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {tab === "departments" && (
            <Button
              className={primary}
              onClick={() =>
                setDepartmentFormOpen(
                  (v) => !v,
                )
              }
            >
              <CirclePlus className="size-4" />
              {t.createDepartment}
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {tab === "departments" &&
            departmentFormOpen && (
              <form
                onSubmit={(e) =>
                  void addDepartment(e)
                }
                className="grid gap-3 border-b p-5 sm:grid-cols-2"
              >
                <Input
                  required
                  maxLength={120}
                  placeholder={t.name}
                  value={departmentName}
                  onChange={(e) =>
                    setDepartmentName(
                      e.target.value,
                    )
                  }
                />
                <Input
                  maxLength={2000}
                  placeholder={t.description}
                  value={departmentDescription}
                  onChange={(e) =>
                    setDepartmentDescription(
                      e.target.value,
                    )
                  }
                />
                <div className="flex gap-2 sm:col-span-2">
                  <Button
                    type="submit"
                    disabled={busy}
                    className={primary}
                  >
                    {t.create}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setDepartmentFormOpen(
                        false,
                      )
                    }
                  >
                    {t.cancel}
                  </Button>
                </div>
              </form>
            )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t.loading}
            </div>
          ) : tab === "agents" ? (
            filtered.length ? (
              <div className="divide-y">
                {filtered.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg border p-3">
                        <Bot className="size-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {agent.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {agent.role}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {departmentNames.get(
                            agent.departmentId ?? "",
                          ) ?? t.unassigned}
                          {" · "}
                          {agent.modelId ??
                            t.chooseModel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-foreground"
                      >
                        {agent.status === "active"
                          ? t.running
                          : t[agent.status]}
                      </Badge>

                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={t.editAgent}
                        onClick={() => {
                          setEditingAgent(
                            agent,
                          );
                          setEditorOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={t.delete}
                        onClick={() =>
                          setDeleteTarget(
                            agent,
                          )
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
                {t.emptyAgents}
              </div>
            )
          ) : tab === "departments" ? (
            departments.length ? (
              <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {departments.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-lg border p-4"
                  >
                    <p className="font-medium">
                      {d.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {d.slug}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {d.description}
                    </p>
                    <p className="mt-3 text-xs">
                      {
                        agents.filter(
                          (a) =>
                            a.departmentId ===
                            d.id,
                        ).length
                      }{" "}
                      {t.agents}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-sm text-muted-foreground">
                {t.emptyDepartments}
              </div>
            )
          ) : templates.length ? (
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-col rounded-lg border p-4"
                >
                  <p className="font-medium">
                    {template.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {template.category}
                    {" · v"}
                    {template.version}
                  </p>
                  <p className="my-4 flex-1 text-sm text-muted-foreground">
                    {template.description}
                  </p>
                  <Button
                    disabled={busy}
                    className={primary}
                    onClick={() =>
                      void createFromTemplate(
                        template,
                      )
                    }
                  >
                    {t.createFromTemplate}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-muted-foreground">
              {t.emptyTemplates}
            </div>
          )}
        </CardContent>
      </Card>

      <AgentFormDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        agent={editingAgent}
        departments={departments}
        onSaved={refresh}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => {
          if (!v && !busy) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.deleteTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name}
              {" — "}
              {t.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={busy}
            >
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className={primary}
              onClick={(e) => {
                e.preventDefault();
                void removeAgent();
              }}
            >
              {busy && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
