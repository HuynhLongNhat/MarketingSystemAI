import { HttpException, HttpStatus, Injectable, OnModuleDestroy, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Redis } from "ioredis";

const RATE_LIMIT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
local ttl = redis.call("PTTL", KEYS[1])
return {count, ttl}
`;
const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) end
return 0
`;
const WINDOW_SECONDS = 60;
const MAX_TESTS_PER_WINDOW = 5;
const LOCK_TTL_MS = 12_000;

export type SearchProviderTestLease = { release: () => Promise<void> };

@Injectable()
export class SearchProviderTestRateLimiter implements OnModuleDestroy {
  private readonly redis = new Redis({ host: process.env.REDIS_HOST ?? "127.0.0.1", port: Number(process.env.REDIS_PORT ?? 6379), lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1, connectTimeout: 3000 });
  constructor() { this.redis.on("error", () => undefined); }
  private async connect() {
    if (this.redis.status === "ready") return;
    if (this.redis.status === "wait") { await this.redis.connect(); return; }
    if (this.redis.status === "connecting") { await new Promise<void>((resolve, reject) => { const ready = () => { cleanup(); resolve(); }; const error = (value: Error) => { cleanup(); reject(value); }; const cleanup = () => { this.redis.off("ready", ready); this.redis.off("error", error); }; this.redis.once("ready", ready); this.redis.once("error", error); }); return; }
    throw new Error("Redis is not ready");
  }
  async acquire(organizationId: string, connectionId: string): Promise<SearchProviderTestLease> {
    const base = `marketing-system:search-provider-test:${organizationId}:${connectionId}`;
    const token = randomUUID();
    try {
      await this.connect();
      const result = await this.redis.eval(RATE_LIMIT_SCRIPT, 1, `${base}:rate`, String(WINDOW_SECONDS));
      if (!Array.isArray(result) || Number(result[0]) > MAX_TESTS_PER_WINDOW) {
        const ttl = Array.isArray(result) ? Number(result[1]) : WINDOW_SECONDS * 1000;
        throw new HttpException({ statusCode: HttpStatus.TOO_MANY_REQUESTS, code: "SEARCH_PROVIDER_TEST_RATE_LIMITED", message: "Too many connection tests. Please try again later.", retryAfter: Math.max(1, Math.ceil(ttl / 1000)) }, HttpStatus.TOO_MANY_REQUESTS);
      }
      const locked = await this.redis.set(`${base}:lock`, token, "PX", LOCK_TTL_MS, "NX");
      if (locked !== "OK") throw new HttpException({ statusCode: HttpStatus.TOO_MANY_REQUESTS, code: "SEARCH_PROVIDER_TEST_IN_PROGRESS", message: "A connection test is already in progress." }, HttpStatus.TOO_MANY_REQUESTS);
      return { release: async () => { try { await this.redis.eval(RELEASE_LOCK_SCRIPT, 1, `${base}:lock`, token); } catch { /* TTL prevents orphaned locks. */ } } };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException({ code: "SEARCH_PROVIDER_TEST_LIMITER_UNAVAILABLE", message: "Connection testing is temporarily unavailable." });
    }
  }
  async onModuleDestroy() { if (this.redis.status === "ready") await this.redis.quit(); else this.redis.disconnect(); }
}
