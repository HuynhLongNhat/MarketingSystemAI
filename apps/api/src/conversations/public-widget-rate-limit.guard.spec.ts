import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HttpException } from "@nestjs/common";
import { PublicWidgetRateLimitGuard, WIDGET_RATE_LIMIT_KEY } from "./public-widget-rate-limit.guard.js";

describe("PublicWidgetRateLimitGuard", () => {
  it("returns 429 when Redis shared counter exceeds the endpoint limit", async () => {
    const guard = new PublicWidgetRateLimitGuard({ get: () => "create-session" } as never);
    Reflect.set(guard, "redis", { status: "ready", on() {}, eval: async () => [21, 60_000], disconnect() {}, quit: async () => undefined });
    const headers = new Map<string, string>();
    const execution = { getHandler: () => ({}), switchToHttp: () => ({ getRequest: () => ({ ip: "127.0.0.1", socket: {}, headers: {} }), getResponse: () => ({ setHeader: (key: string, value: string) => headers.set(key, value) }) }) } as never;
    await assert.rejects(() => guard.canActivate(execution), (error: unknown) => error instanceof HttpException && error.getStatus() === 429);
    assert.equal(headers.get("Retry-After"), "60");
  });
});
