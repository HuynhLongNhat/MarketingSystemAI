
import { apiFetch } from "./api-client";

export const AI_MODEL_PURPOSES = [
  "customer_support",
  "message_enhancement",
  "general",
  "embedding",
] as const;

export type AiModelPurpose =
  (typeof AI_MODEL_PURPOSES)[number];

export type AiProviderType =
  | "openrouter"
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "deepseek"
  | "mistral"
  | "together"
  | "fireworks"
  | "cerebras"
  | "xai"
  | "ollama"
  | "openai_compatible";

export interface AiProviderConnection {
  id: string;
  provider: AiProviderType;
  name: string;
  enabled: boolean;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiProviderInput {
  provider: AiProviderType;
  name: string;
  apiKey: string;
}

export interface UpdateAiProviderInput {
  name?: string;
  apiKey?: string;
  enabled?: boolean;
}

export interface AiModelDefault {
  id: string;
  purpose: AiModelPurpose;
  connectionId: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
}
export interface OrganizationAiUsage { periodStart: string; periodEnd: string; usedTokens: number; requestCount: number; monthlyTokenLimit: number | null; remainingTokens: number | null; tracking: { embeddings: "not_separately_tracked" }; }
export interface ProviderUsage { status: "available"|"unsupported"|"unauthorized"|"rate_limited"|"unavailable"; usage?: number|null; spendingLimit?: number|null; remaining?: number|null; freeTier?: boolean|null; expiresAt?: string|null; checkedAt: string; }

export interface SetAiModelDefaultInput {
  connectionId: string;
  modelId: string;
}

export interface CatalogProvider {
  id: AiProviderType;
  name: string;
  catalogProvider: string | null;
  runtimeProtocol:
    | "openai"
    | "anthropic"
    | "google"
    | "ollama";
  baseUrl: string | null;
  requiresApiKey: boolean;
}

export interface CatalogModel {
  id: string;
  name: string;
  provider: AiProviderType;
  contextWindow: number | null;
  inputPricePerMillion: number | null;
  outputPricePerMillion: number | null;
  supportsVision: boolean | null;
  supportsTools: boolean | null;
  dimensions?: number;
}

export type ConnectionTestStatus =
  | "connected"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "unavailable"
  | "unsupported";

export interface ConnectionTestResult {
  connectionId: string;
  provider: AiProviderType;
  status: ConnectionTestStatus;
  success: boolean;
  message: string;
  checkedAt: string;
}

const BASE_PATH = "/ai-providers";

export const aiProvidersApi = {
  organizationUsage() { return apiFetch<OrganizationAiUsage>(`${BASE_PATH}/usage/organization`); },
  connectionUsage(id: string) { return apiFetch<ProviderUsage>(`${BASE_PATH}/${encodeURIComponent(id)}/usage`); },
  listConnections() {
    return apiFetch<AiProviderConnection[]>(BASE_PATH);
  },

  getConnection(id: string) {
    return apiFetch<AiProviderConnection>(
      `${BASE_PATH}/${encodeURIComponent(id)}`,
    );
  },

  createConnection(input: CreateAiProviderInput) {
    return apiFetch<AiProviderConnection>(
      BASE_PATH,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
  },

  updateConnection(
    id: string,
    input: UpdateAiProviderInput,
  ) {
    return apiFetch<AiProviderConnection>(
      `${BASE_PATH}/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
  },

  deleteConnection(id: string) {
    return apiFetch<{ deleted: boolean }>(
      `${BASE_PATH}/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  },

  testConnection(id: string) {
    return apiFetch<ConnectionTestResult>(
      `${BASE_PATH}/${encodeURIComponent(id)}/test`,
      { method: "POST" },
    );
  },

  listModelDefaults() {
    return apiFetch<AiModelDefault[]>(
      `${BASE_PATH}/model-defaults`,
    );
  },

  setModelDefault(
    purpose: AiModelPurpose,
    input: SetAiModelDefaultInput,
  ) {
    return apiFetch<AiModelDefault>(
      `${BASE_PATH}/model-defaults/${encodeURIComponent(purpose)}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    );
  },

  deleteModelDefault(purpose: AiModelPurpose) {
    return apiFetch<{ deleted: boolean }>(
      `${BASE_PATH}/model-defaults/${encodeURIComponent(purpose)}`,
      { method: "DELETE" },
    );
  },

  listCatalogProviders() {
    return apiFetch<CatalogProvider[]>(
      `${BASE_PATH}/catalog/providers`,
    );
  },

  listCatalogModels(provider: AiProviderType) {
    return apiFetch<CatalogModel[]>(
      `${BASE_PATH}/catalog/models?provider=${encodeURIComponent(provider)}`,
    );
  },

  listEmbeddingModels(provider: AiProviderType) {
    return apiFetch<CatalogModel[]>(
      `${BASE_PATH}/catalog/embedding-models?provider=${encodeURIComponent(provider)}`,
    );
  },
};
