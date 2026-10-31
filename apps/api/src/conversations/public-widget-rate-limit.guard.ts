import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { Redis } from "ioredis";

export const WIDGET_RATE_LIMIT_KEY = "widgetRateLimit";

export type WidgetRateLimitType =
  | "create-session"
  | "create-conversation"
  | "send-message";

type RateLimitRule = {
  limit: number;
  windowSeconds: number;
};

const RULES: Record<WidgetRateLimitType, RateLimitRule> = {
  "create-session": {
    limit: 20,
    windowSeconds: 60,
  },
  "create-conversation": {
    limit: 10,
    windowSeconds: 60,
  },
  "send-message": {
    limit: 30,
    windowSeconds: 60,
  },
};

// INCR + EXPIRE trong cùng một Redis script để tránh race condition.
// Kết quả: [requestCount, remainingTtlMilliseconds].
const RATE_LIMIT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1]) * 1000
end
return {count, ttl}
`;

@Injectable()
export class PublicWidgetRateLimitGuard
  implements CanActivate, OnModuleDestroy
{
  private readonly redis: Redis;

  constructor(private readonly reflector: Reflector) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? "127.0.0.1",
      port: Number(process.env.REDIS_PORT ?? 6379),
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    });

    // Redis errors are handled by canActivate.
    // This listener prevents an unhandled error event.
    this.redis.on("error", () => undefined);
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private getClientKey(request: Request, type: WidgetRateLimitType): string {
    if (type === "create-session") {
      // Express req.ip uses the configured trust proxy policy.
      // Do not trust X-Forwarded-For directly.
      const ip = request.ip || request.socket.remoteAddress || "unknown";

      return `ip:${this.hash(ip)}`;
    }

    const authorization = request.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      // Requests without a token share an IP-based bucket.
      const ip = request.ip || request.socket.remoteAddress || "unknown";

      return `missing-token:${this.hash(ip)}`;
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      const ip = request.ip || request.socket.remoteAddress || "unknown";

      return `missing-token:${this.hash(ip)}`;
    }

    // Never store the raw widget token in Redis keys.
    return `token:${this.hash(token)}`;
  }

  private async ensureConnected(): Promise<void> {
    if (this.redis.status === "ready") {
      return;
    }

    if (this.redis.status === "wait") {
      await this.redis.connect();
      return;
    }

    if (this.redis.status === "connecting") {
      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          cleanup();
          resolve();
        };

        const onError = (error: Error) => {
          cleanup();
          reject(error);
        };

        const cleanup = () => {
          this.redis.off("ready", onReady);
          this.redis.off("error", onError);
        };

        this.redis.once("ready", onReady);
        this.redis.once("error", onError);
      });
      return;
    }

    throw new Error("Redis is not ready");
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const type = this.reflector.get<WidgetRateLimitType>( 
      WIDGET_RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!type) {
      return true;
    }

    const rule = RULES[type];

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const clientKey = this.getClientKey(request, type);

    const key = ["cms", "public-widget", "rate-limit", type, clientKey].join(
      ":",
    );

    let result: unknown;

    try {
      await this.ensureConnected();

      result = await this.redis.eval(
        RATE_LIMIT_SCRIPT,
        1,
        key,
        String(rule.windowSeconds),
      );
    } catch {
      // Fail closed: do not silently disable rate limiting
      // if Redis is unavailable.
      throw new ServiceUnavailableException("Widget temporarily unavailable");
    }

    if (!Array.isArray(result) || result.length !== 2) {
      throw new ServiceUnavailableException("Widget temporarily unavailable");
    }

    const count = Number(result[0]);
    const ttlMilliseconds = Number(result[1]);

    if (!Number.isFinite(count) || !Number.isFinite(ttlMilliseconds)) {
      throw new ServiceUnavailableException("Widget temporarily unavailable");
    }

    const retryAfter = Math.max(1, Math.ceil(ttlMilliseconds / 1000));

    response.setHeader("X-RateLimit-Limit", String(rule.limit));

    response.setHeader(
      "X-RateLimit-Remaining",
      String(Math.max(0, rule.limit - count)),
    );

    if (count > rule.limit) {
      response.setHeader("Retry-After", String(retryAfter));

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Too many requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status === "ready") {
      await this.redis.quit();
      return;
    }

    this.redis.disconnect();
  }
}
