import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EmbeddingProviderError,
  KnowledgeEmbeddingService,
} from "./knowledge-embedding.service.js";

type EmbeddingConfiguration = {
  connectionId: string;
  provider: "openrouter";
  modelId: string;
  dimensions: number;
  endpoint: string;
  apiKey: string;
};

type Embed = (
  contents: string[],
  configuration: EmbeddingConfiguration,
) => Promise<number[][]>;

const configuration: EmbeddingConfiguration = {
  connectionId: "connection-id",
  provider: "openrouter",
  modelId: "openai/text-embedding-3-small",
  dimensions: 1536,
  endpoint: "https://openrouter.ai/api/v1/embeddings",
  apiKey: "test-key",
};

function embeddingServiceEmbed(): Embed {
  const service = new KnowledgeEmbeddingService();
  return Reflect.get(service, "embed") as Embed;
}

describe("knowledge embeddings provider request", () => {
  it("uses the OpenRouter embedding endpoint and validates 1536 vectors", async () => {
    const originalFetch = globalThis.fetch;
    const vector = Array.from({ length: 1536 }, () => 0.25);
    let request: RequestInit | undefined;
    let url = "";

    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: async (input: string | URL | Request, init?: RequestInit) => {
        url = String(input);
        request = init;
        return Response.json({
          data: [{ index: 0, embedding: vector }],
        });
      },
    });

    try {
      const vectors = await embeddingServiceEmbed()(
        ["Agency roster"],
        configuration,
      );

      assert.equal(url, configuration.endpoint);
      assert.equal(
        new Headers(request?.headers).get("authorization"),
        "Bearer test-key",
      );
      assert.deepEqual(JSON.parse(String(request?.body)), {
        model: "openai/text-embedding-3-small",
        input: ["Agency roster"],
        dimensions: 1536,
      });
      assert.equal(vectors[0]?.length, 1536);
    } finally {
      Object.defineProperty(globalThis, "fetch", {
        configurable: true,
        value: originalFetch,
      });
    }
  });

  it("does not retry an insufficient-credit response", async () => {
    const originalFetch = globalThis.fetch;

    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: async () => new Response(null, { status: 402 }),
    });

    try {
      await assert.rejects(
        () => embeddingServiceEmbed()(["Agency roster"], configuration),
        (error: unknown) =>
          error instanceof EmbeddingProviderError &&
          error.retryable === false &&
          error.message === "Embedding provider has insufficient credits",
      );
    } finally {
      Object.defineProperty(globalThis, "fetch", {
        configurable: true,
        value: originalFetch,
      });
    }
  });
});
