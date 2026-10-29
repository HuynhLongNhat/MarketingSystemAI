
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const baseUrl =
  process.env.API_TEST_URL ?? "http://localhost:3002";

async function get(path: string) {
  return fetch(`${baseUrl}${path}`, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
}

describe("Security - HTTP API", () => {
  it("rejects unauthenticated widget settings", async () => {
    const response = await get("/v1/widget-settings/current");
    assert.equal(response.status, 401);
  });

  it("rejects unauthenticated organization", async () => {
    const response = await get("/v1/organizations/current");
    assert.equal(response.status, 401);
  });

  it("rejects unauthenticated member listing", async () => {
    const response = await get(
      "/v1/organizations/current/members",
    );
    assert.equal(response.status, 401);
  });

  it("rejects unauthenticated legacy tenant endpoint", async () => {
    const response = await get(
      "/v1/widget-settings/another-organization",
    );
    assert.equal(response.status, 401);
  });
});
