import assert from "node:assert/strict";
import { describe, it } from "node:test";

const baseUrl = process.env.API_TEST_URL ?? "http://localhost:3002";
const connectionId = "00000000-0000-4000-8000-000000000001";

async function request(path: string, method: string) {
  return fetch(`${baseUrl}${path}`, { method, redirect: "manual", signal: AbortSignal.timeout(5000) });
}

describe("Search Provider HTTP authorization", () => {
  it("rejects unauthenticated list and management requests", async () => {
    assert.equal((await request("/v1/search-providers", "GET")).status, 401);
    assert.equal((await request("/v1/search-providers", "POST")).status, 401);
    assert.equal((await request(`/v1/search-providers/${connectionId}`, "PATCH")).status, 401);
    assert.equal((await request(`/v1/search-providers/${connectionId}`, "DELETE")).status, 401);
  });
  it("rejects unauthenticated provider tests before the limiter or Tavily", async () => {
    assert.equal((await request(`/v1/search-providers/${connectionId}/test`, "POST")).status, 401);
  });
});
