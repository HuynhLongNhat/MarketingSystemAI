import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getEmbeddingModelDimensions } from "./provider-registry.js";

describe("embedding provider registry", () => {
  it("accepts the initial OpenAI embedding model at the vector column dimension", () => {
    assert.equal(
      getEmbeddingModelDimensions(
        "openai",
        "text-embedding-3-small",
      ),
      1536,
    );
  });

  it("does not treat a chat model or another provider as compatible by default", () => {
    assert.equal(
      getEmbeddingModelDimensions("openai", "gpt-4o-mini"),
      undefined,
    );
    assert.equal(
      getEmbeddingModelDimensions(
        "openrouter",
        "text-embedding-3-small",
      ),
      undefined,
    );
  });
});
