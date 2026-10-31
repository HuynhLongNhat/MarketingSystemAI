
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const baseUrl =
  process.env.API_TEST_URL ?? "http://localhost:3002";

async function request(
  path: string,
  method: string,
  body?: Record<string, unknown>,
) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
}

describe("MVP-05.2 - Unauthenticated HTTP", () => {
  it("GET connections requires authentication", async () => {
    const response = await request("/v1/ai-providers", "GET");
    assert.equal(response.status, 401);
  });

  it("POST connections requires authentication", async () => {
    const response = await request(
      "/v1/ai-providers",
      "POST",
      {
        provider: "openrouter",
        name: "Test Provider",
        apiKey: "sk-test-not-real",
      },
    );

    assert.equal(response.status, 401);
  });

  it("GET model defaults requires authentication", async () => {
    const response = await request(
      "/v1/ai-providers/model-defaults",
      "GET",
    );

    assert.equal(response.status, 401);
  });

  it("PUT model defaults requires authentication", async () => {
    const response = await request(
      "/v1/ai-providers/model-defaults/general",
      "PUT",
      {
        connectionId: "00000000-0000-4000-8000-000000000001",
        modelId: "test-model",
      },
    );

    assert.equal(response.status, 401);
  });

  it("PATCH connection requires authentication", async () => {
    const response = await request(
      "/v1/ai-providers/00000000-0000-4000-8000-000000000001",
      "PATCH",
      { enabled: false },
    );

    assert.equal(response.status, 401);
  });

  it("DELETE connection requires authentication", async () => {
    const response = await request(
      "/v1/ai-providers/00000000-0000-4000-8000-000000000001",
      "DELETE",
    );

    assert.equal(response.status, 401);
  });
});
