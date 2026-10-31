
import {
  BadRequestException,
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";

import {
  PROVIDER_REGISTRY,
  listProviderDefinitions,
} from "./provider-registry.js";

import type { AiProviderType } from "@workspace/db/node";

export interface CatalogModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number | null;
  inputPricePerMillion: number | null;
  outputPricePerMillion: number | null;
  supportsVision: boolean;
  supportsTools: boolean;
}

type JsonObject = Record<string, unknown>;

function record(value: unknown): JsonObject | null {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function numberOrNull(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) return value;

  if (
    typeof value === "string" &&
    value.trim() &&
    Number.isFinite(Number(value))
  ) return Number(value);

  return null;
}

function pricePerMillion(value: unknown): number | null {
  const number = numberOrNull(value);
  return number === null ? null : number * 1_000_000;
}

@Injectable()
export class ModelCatalogService {
  private readonly cache = new Map<
    string,
    { expiresAt: number; data: CatalogModel[] }
  >();

  listProviders() {
    return listProviderDefinitions();
  }

  async listModels(provider: string): Promise<CatalogModel[]> {
    if (
      !Object.prototype.hasOwnProperty.call(
        PROVIDER_REGISTRY,
        provider,
      )
    ) {
      throw new BadRequestException("Unsupported provider");
    }

    const definition =
      PROVIDER_REGISTRY[provider as AiProviderType];

    if (!definition.catalogProvider) {
      return [];
    }

    const cached = this.cache.get(provider);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const models =
      provider === "openrouter"
        ? await this.getOpenRouterModels()
        : await this.getLiteLLMModels(
            provider,
            definition.catalogProvider,
          );

    this.cache.set(provider, {
      data: models,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    return models;
  }

  private async getJson(url: string): Promise<unknown> {
    let response: Response;

    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new ServiceUnavailableException(
        "External model catalog unavailable",
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `External catalog HTTP ${response.status}`,
      );
    }

    const contentLength = Number(
      response.headers.get("content-length") ?? 0,
    );

    if (contentLength > 8_000_000) {
      throw new BadGatewayException(
        "Catalog response too large",
      );
    }

    try {
      const text = await response.text();

      if (text.length > 8_000_000) {
        throw new BadGatewayException(
          "Catalog response too large",
        );
      }

      return JSON.parse(text) as unknown;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException(
        "Invalid catalog JSON",
      );
    }
  }

  private async getLiteLLMModels(
    provider: string,
    catalogProvider: string,
  ): Promise<CatalogModel[]> {
    const url = new URL(
      "https://models.litellm.ai/model_catalog",
    );

    url.searchParams.set("provider", catalogProvider);
    url.searchParams.set("page_size", "100");

    const models: CatalogModel[] = [];
    const seen = new Set<string>();

    for (let page = 1; page <= 20; page++) {
      url.searchParams.set("page", String(page));

      const payload = record(
        await this.getJson(url.toString()),
      );

      const entries = payload?.data;

      if (!Array.isArray(entries)) {
        throw new BadGatewayException(
          "Unexpected LiteLLM response",
        );
      }

      for (const raw of entries) {
        const item = record(raw);
        if (!item) continue;

        const id =
          typeof item.id === "string"
            ? item.id
            : null;

        if (!id || seen.has(id)) continue;
        seen.add(id);

        models.push({
          id,
          name:
            typeof item.name === "string"
              ? item.name
              : id,
          provider,
          contextWindow:
            numberOrNull(item.max_input_tokens) ??
            numberOrNull(item.max_tokens),
          inputPricePerMillion: pricePerMillion(
            item.input_cost_per_token,
          ),
          outputPricePerMillion: pricePerMillion(
            item.output_cost_per_token,
          ),
          supportsVision:
            item.supports_vision === true,
          supportsTools:
            item.supports_function_calling === true,
        });
      }

      if (entries.length < 100) break;
    }

    return models.sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  private async getOpenRouterModels(): Promise<CatalogModel[]> {
    const payload = record(
      await this.getJson(
        "https://openrouter.ai/api/v1/models",
      ),
    );

    const entries = payload?.data;

    if (!Array.isArray(entries)) {
      throw new BadGatewayException(
        "Unexpected OpenRouter response",
      );
    }

    return entries.flatMap((raw): CatalogModel[] => {
      const item = record(raw);
      if (!item || typeof item.id !== "string") {
        return [];
      }

      const pricing = record(item.pricing);
      const architecture = record(item.architecture);
      const modalities = architecture?.input_modalities;
      const parameters = item.supported_parameters;

      return [{
        id: item.id,
        name:
          typeof item.name === "string"
            ? item.name
            : item.id,
        provider: "openrouter",
        contextWindow:
          numberOrNull(item.context_length),
        inputPricePerMillion:
          pricePerMillion(pricing?.prompt),
        outputPricePerMillion:
          pricePerMillion(pricing?.completion),
        supportsVision:
          Array.isArray(modalities) &&
          modalities.includes("image"),
        supportsTools:
          Array.isArray(parameters) &&
          parameters.includes("tools"),
      }];
    }).sort((a, b) => a.name.localeCompare(b.name));
  }
}
