import { apiFetch } from "./api-client";

export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type AiTask = { id: string; organizationId: string; createdBy: string; title: string; description: string; status: TaskStatus; connectionId: string | null; modelId: string | null; agentId: string | null; agentName: string | null; agentRole: string | null; webResearchEnabled: boolean; researchProvider: string | null; result: string | null; error: string | null; createdAt: string; startedAt: string | null; completedAt: string | null; updatedAt: string };
export type AiTaskDetail = AiTask & { events: Array<{ id: string; type: string; message: string; createdAt: string }>; researchRuns: Array<{ id: string; provider: string; query: string | null; status: string; sourceCount: number; safeErrorCode: string | null; createdAt: string; completedAt: string | null }>; researchSources: Array<{ id: string; ordinal: number; citationNumber: number | null; title: string; canonicalUrl: string; displayUrl: string; domain: string; excerpt: string | null; status: string; retrievedAt: string | null }> };

export const tasksApi = {
  list: (agentId?: string) => apiFetch<AiTask[]>(agentId ? `/tasks?agentId=${encodeURIComponent(agentId)}` : "/tasks"),
  get: (id: string) => apiFetch<AiTaskDetail>(`/tasks/${encodeURIComponent(id)}`),
  create: (input: { title: string; description: string; agentId?: string }) => apiFetch<AiTask>("/tasks", { method: "POST", body: JSON.stringify(input) }),
  cancel: (id: string) => apiFetch<{ cancelled: boolean }>(`/tasks/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
};
