
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

export function listProviderDefinitions() {
  return AI_PROVIDER_TYPES.map(
    (id) => PROVIDER_REGISTRY[id],
  );
}
