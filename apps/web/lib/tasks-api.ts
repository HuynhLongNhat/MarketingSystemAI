import { apiFetch } from "./api-client";

export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type AiTask = { id: string; organizationId: string; createdBy: string; title: string; description: string; status: TaskStatus; connectionId: string | null; modelId: string | null; result: string | null; error: string | null; createdAt: string; startedAt: string | null; completedAt: string | null; updatedAt: string };
export type AiTaskDetail = AiTask & { events: Array<{ id: string; type: string; message: string; createdAt: string }> };

export const tasksApi = {
  list: () => apiFetch<AiTask[]>("/tasks"),
  get: (id: string) => apiFetch<AiTaskDetail>(`/tasks/${encodeURIComponent(id)}`),
  create: (input: { title: string; description: string }) => apiFetch<AiTask>("/tasks", { method: "POST", body: JSON.stringify(input) }),
  cancel: (id: string) => apiFetch<{ cancelled: boolean }>(`/tasks/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
};
