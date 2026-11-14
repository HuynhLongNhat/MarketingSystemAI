import { apiFetch } from "./api-client";

export type SearchProviderType = "tavily";
export interface SearchProviderConnection { id: string; provider: SearchProviderType; name: string; enabled: boolean; hasApiKey: true; createdAt: string; updatedAt: string; }
export interface SearchConnectionTestResult { connectionId: string; provider: SearchProviderType; status: "connected" | "unauthorized" | "rate_limited" | "timeout" | "unavailable" | "disabled"; success: boolean; message: string; checkedAt: string; }
const BASE_PATH = "/search-providers";
export const searchProvidersApi = {
  list: () => apiFetch<SearchProviderConnection[]>(BASE_PATH),
  create: (input: { provider: SearchProviderType; name: string; apiKey: string }) => apiFetch<SearchProviderConnection>(BASE_PATH, { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: { name?: string; apiKey?: string; enabled?: boolean }) => apiFetch<SearchProviderConnection>(`${BASE_PATH}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) => apiFetch<{ deleted: boolean }>(`${BASE_PATH}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  test: (id: string) => apiFetch<SearchConnectionTestResult>(`${BASE_PATH}/${encodeURIComponent(id)}/test`, { method: "POST" }),
};
