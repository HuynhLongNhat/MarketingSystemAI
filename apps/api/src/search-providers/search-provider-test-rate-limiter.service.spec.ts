import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { HttpException } from "@nestjs/common";

import { SearchProviderTestRateLimiter } from "./search-provider-test-rate-limiter.service.js";

function limiterWith(redis: { status: string; on(): void; eval: (...args: unknown[]) => Promise<unknown>; set: (...args: unknown[]) => Promise<unknown>; disconnect(): void }) {
  const limiter = new SearchProviderTestRateLimiter();
  Reflect.set(limiter, "redis", redis);
  return limiter;
}

describe("SearchProviderTestRateLimiter", () => {
  it("does not call Tavily lease path when the shared rate bucket is exceeded", async () => {
    let lockAttempted = false;
    const limiter = limiterWith({ status: "ready", on() {}, eval: async () => [6, 60_000], set: async () => { lockAttempted = true; return "OK"; }, disconnect() {} });
    await assert.rejects(() => limiter.acquire("org", "connection"), (error: unknown) => error instanceof HttpException && error.getStatus() === 429 && (error.getResponse() as { code: string }).code === "SEARCH_PROVIDER_TEST_RATE_LIMITED");
    assert.equal(lockAttempted, false);
  });

  it("takes one distributed lock and releases only its own token", async () => {
    const evalCalls: unknown[][] = [];
    const limiter = limiterWith({ status: "ready", on() {}, eval: async (...args: unknown[]) => { evalCalls.push(args); return evalCalls.length === 1 ? [1, 60_000] : 1; }, set: async () => "OK", disconnect() {} });
    const lease = await limiter.acquire("org", "connection");
    await lease.release();
    assert.equal(evalCalls.length, 2);
  });

  it("rejects concurrent tests before a provider request can start", async () => {
    const limiter = limiterWith({ status: "ready", on() {}, eval: async () => [1, 60_000], set: async () => null, disconnect() {} });
    await assert.rejects(() => limiter.acquire("org", "connection"), (error: unknown) => error instanceof HttpException && (error.getResponse() as { code: string }).code === "SEARCH_PROVIDER_TEST_IN_PROGRESS");
  });
});
