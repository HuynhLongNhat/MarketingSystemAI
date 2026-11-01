
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import {
  aiProvidersApi,
  type AiProviderConnection,
} from "@/lib/ai-providers-api";
import {
  workforceApi,
  type AiAgent,
  type AgentStatus,
  type Department,
  type CreateAgentInput,
  type UpdateAgentInput,
} from "@/lib/workforce-api";
import { useUiLanguage } from "@/lib/ui-language";
import { ModelPicker } from "./model-picker";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AiAgent | null;
  departments: Department[];
  onSaved: () => Promise<void>;
}

interface Form {
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
  departmentId: string;
  connectionId: string;
  modelId: string;
  status: AgentStatus;
}

const empty: Form = {
  name: "",
  role: "",
  description: "",
  systemPrompt: "",
  departmentId: "",
  connectionId: "",
  modelId: "",
  status: "draft",
};

const statuses: AgentStatus[] = [
  "draft",
  "active",
  "paused",
  "archived",
];

export function AgentFormDialog({
  open,
  onOpenChange,
  agent,
  departments,
  onSaved,
}: Props) {
  const { t } = useUiLanguage();

  const [form, setForm] = useState<Form>(empty);
  const [connections, setConnections] = useState<
    AiProviderConnection[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [connectionsLoading, setConnectionsLoading] =
    useState(false);

  useEffect(() => {
    if (!open) return;

    setForm(
      agent
        ? {
            name: agent.name,
            role: agent.role,
            description: agent.description ?? "",
            systemPrompt: agent.systemPrompt,
            departmentId: agent.departmentId ?? "",
            connectionId: agent.connectionId ?? "",
            modelId: agent.modelId ?? "",
            status: agent.status,
          }
        : { ...empty },
    );

    let alive = true;
    setConnectionsLoading(true);

    void aiProvidersApi
      .listConnections()
      .then((items) => {
        if (alive) setConnections(items);
      })
      .catch(() => {
        if (alive) toast.error(t.failed);
      })
      .finally(() => {
        if (alive) setConnectionsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open, agent, t.failed]);

  const selectedConnection = connections.find(
    (item) => item.id === form.connectionId,
  );

  const update = <K extends keyof Form>(
    key: K,
    value: Form[K],
  ) =>
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.role.trim() ||
      !form.systemPrompt.trim()
    ) {
      toast.error(t.required);
      return;
    }

    setSaving(true);

    try {
      if (agent) {
        const input: UpdateAgentInput = {
          name: form.name.trim(),
          role: form.role.trim(),
          description: form.description.trim(),
          systemPrompt: form.systemPrompt.trim(),
          departmentId: form.departmentId || null,
          connectionId: form.connectionId || null,
          modelId: form.modelId || null,
          status: form.status,
        };

        await workforceApi.updateAgent(agent.id, input);
      } else {
        const input: CreateAgentInput = {
          name: form.name.trim(),
          role: form.role.trim(),
          description: form.description.trim(),
          systemPrompt: form.systemPrompt.trim(),
          ...(form.departmentId
            ? { departmentId: form.departmentId }
            : {}),
          ...(form.connectionId
            ? { connectionId: form.connectionId }
            : {}),
          ...(form.modelId
            ? { modelId: form.modelId }
            : {}),
          enabledTools: [],
        };

        await workforceApi.createAgent(input);
      }

      toast.success(agent ? t.saved : t.created);
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error(t.failed, {
        description:
          error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!saving) onOpenChange(value);
      }}
    >
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-5 text-left">
          <DialogTitle>
            {agent ? t.editAgent : t.createAgent}
          </DialogTitle>
          <DialogDescription>{t.subtitle}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => void submit(event)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="grid min-h-0 grid-cols-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span>{t.name} *</span>
              <Input
                required
                maxLength={120}
                value={form.name}
                onChange={(e) =>
                  update("name", e.target.value)
                }
              />
            </label>

            <label className="space-y-2 text-sm">
              <span>{t.role} *</span>
              <Input
                required
                maxLength={120}
                value={form.role}
                onChange={(e) =>
                  update("role", e.target.value)
                }
              />
            </label>

            <label className="space-y-2 text-sm sm:col-span-2">
              <span>{t.description}</span>
              <Textarea
                rows={2}
                maxLength={2000}
                value={form.description}
                onChange={(e) =>
                  update("description", e.target.value)
                }
              />
            </label>

            <div className="space-y-2 text-sm">
              <span>{t.department}</span>
              <Select
                value={form.departmentId || "none"}
                onValueChange={(v) =>
                  update(
                    "departmentId",
                    v === "none" ? "" : v,
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t.unassigned}
                  </SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-sm">
              <span>{t.status}</span>
              <Select
                disabled={!agent}
                value={form.status}
                onValueChange={(v) =>
                  update("status", v as AgentStatus)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "active" ? t.running : t[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-sm">
              <span>{t.connection}</span>
              <Select
                disabled={connectionsLoading}
                value={form.connectionId || "none"}
                onValueChange={(v) =>
                  setForm((current) => ({
                    ...current,
                    connectionId:
                      v === "none" ? "" : v,
                    modelId: "",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t.noConnection}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t.noConnection}
                  </SelectItem>
                  {connections
                    .filter(
                      (c) =>
                        c.enabled ||
                        c.id === form.connectionId,
                    )
                    .map((c) => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                      >
                        {c.name} ({c.provider})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-sm">
              <span>{t.model}</span>
              <ModelPicker
                provider={selectedConnection?.provider}
                value={form.modelId}
                onChange={(v) =>
                  update("modelId", v)
                }
                disabled={saving}
              />
            </div>

            <label className="space-y-2 text-sm sm:col-span-2">
              <span>{t.prompt} *</span>
              <Textarea
                required
                rows={7}
                maxLength={20000}
                value={form.systemPrompt}
                onChange={(e) =>
                  update("systemPrompt", e.target.value)
                }
              />
            </label>
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              {t.cancel}
            </Button>

            <Button
              type="submit"
              disabled={saving}
              className="bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {saving && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {agent ? t.save : t.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
