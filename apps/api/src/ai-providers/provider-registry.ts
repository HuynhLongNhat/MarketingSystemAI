
import {
  AI_PROVIDER_TYPES,
  type AiProviderType,
} from "@workspace/db/node";

export interface ProviderDefinition {
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

export const PROVIDER_REGISTRY: Record<
  AiProviderType,
  ProviderDefinition
> = {
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    catalogProvider: "openrouter",
    runtimeProtocol: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    requiresApiKey: true,
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    catalogProvider: "openai",
    runtimeProtocol: "openai",
    baseUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic Claude",
    catalogProvider: "anthropic",
    runtimeProtocol: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    requiresApiKey: true,
  },
  google: {
    id: "google",
    name: "Google Gemini",
    catalogProvider: "gemini",
    runtimeProtocol: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    requiresApiKey: true,
  },
  groq: {
    id: "groq",
    name: "Groq",
    catalogProvider: "groq",
    runtimeProtocol: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    requiresApiKey: true,
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    catalogProvider: "deepseek",
    runtimeProtocol: "openai",
    baseUrl: "https://api.deepseek.com",
    requiresApiKey: true,
  },
  mistral: {
    id: "mistral",
    name: "Mistral AI",
    catalogProvider: "mistral",
    runtimeProtocol: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    requiresApiKey: true,
  },
  together: {
    id: "together",
    name: "Together AI",
    catalogProvider: "together_ai",
    runtimeProtocol: "openai",
    baseUrl: "https://api.together.xyz/v1",
    requiresApiKey: true,
  },
  fireworks: {
    id: "fireworks",
    name: "Fireworks AI",
    catalogProvider: "fireworks_ai",
    runtimeProtocol: "openai",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    requiresApiKey: true,
  },
  cerebras: {
    id: "cerebras",
    name: "Cerebras",
    catalogProvider: "cerebras",
    runtimeProtocol: "openai",
    baseUrl: "https://api.cerebras.ai/v1",
    requiresApiKey: true,
  },
  xai: {
    id: "xai",
    name: "xAI Grok",
    catalogProvider: "xai",
    runtimeProtocol: "openai",
    baseUrl: "https://api.x.ai/v1",
    requiresApiKey: true,
  },
  ollama: {
    id: "ollama",
    name: "Ollama",
    catalogProvider: null,
    runtimeProtocol: "ollama",
    baseUrl: null,
    requiresApiKey: false,
  },
  openai_compatible: {
    id: "openai_compatible",
    name: "Custom OpenAI-compatible",
    catalogProvider: null,
    runtimeProtocol: "openai",
    baseUrl: null,
    requiresApiKey: true,
  },
};

/**
 * Embedding models currently compatible with the fixed pgvector(1536)
 * knowledge_embeddings column. Add a model here only together with its
 * verified dimension and a compatible storage migration when needed.
 */
export type EmbeddingProviderType = "openai" | "openrouter";

export type EmbeddingModelDefinition = {
  provider: EmbeddingProviderType;
  modelId: string;
  dimensions: number;
  endpoint: string;
};

const EMBEDDING_MODELS: readonly EmbeddingModelDefinition[] = [
  {
    provider: "openai",
    modelId: "text-embedding-3-small",
    dimensions: 1536,
    endpoint: "https://api.openai.com/v1/embeddings",
  },
  {
    provider: "openrouter",
    modelId: "openai/text-embedding-3-small",
    dimensions: 1536,
    endpoint: "https://openrouter.ai/api/v1/embeddings",
  },
];

export function getEmbeddingModelDefinition(
  provider: AiProviderType,
  modelId: string,
): EmbeddingModelDefinition | undefined {
  return EMBEDDING_MODELS.find(
    (model) =>
      model.provider === provider && model.modelId === modelId,
  );
}

export function listEmbeddingModelDefinitions(
  provider?: AiProviderType,
): readonly EmbeddingModelDefinition[] {
  return provider
    ? EMBEDDING_MODELS.filter((model) => model.provider === provider)
    : EMBEDDING_MODELS;
}

export function getEmbeddingModelDimensions(
  provider: AiProviderType,
  modelId: string,
): number | undefined {
  return getEmbeddingModelDefinition(provider, modelId)?.dimensions;
}

export function listProviderDefinitions() {
  return AI_PROVIDER_TYPES.map(
    (id) => PROVIDER_REGISTRY[id],
  );
}
