import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

const HUMAN_TYPING_TTL_SECONDS = 8;
const AI_TYPING_TTL_SECONDS = 120;

export type ConversationTypingStatus =
  | { kind: "human" }
  | { kind: "ai" }
  | { kind: "none" };

@Injectable()
export class ConversationTypingService implements OnModuleDestroy {
  private readonly logger = new Logger(ConversationTypingService.name);
  private readonly redis = new Redis({
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: Number(process.env.REDIS_PORT ?? 6379),
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  constructor() {
    this.redis.on("error", () => undefined);
  }

  private humanKey(organizationId: string, conversationId: string) {
    return `conversation:typing:human:${organizationId}:${conversationId}`;
  }

  private aiKey(organizationId: string, conversationId: string) {
    return `conversation:typing:ai:${organizationId}:${conversationId}`;
  }

  private async ready(): Promise<boolean> {
    try {
      if (this.redis.status === "ready") return true;
      if (this.redis.status === "wait") await this.redis.connect();
      return (this.redis.status as string) === "ready";
    } catch {
      return false;
    }
  }

  async setHumanTyping(input: {
    organizationId: string;
    conversationId: string;
    userId: string;
    active: boolean;
  }): Promise<void> {
    if (!(await this.ready())) return;
    const key = this.humanKey(input.organizationId, input.conversationId);
    try {
      if (input.active) {
        await this.redis.set(key, input.userId, "EX", HUMAN_TYPING_TTL_SECONDS);
      } else {
        // Do not delete a newer indicator written by another assigned user.
        await this.redis.eval(
          "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0",
          1,
          key,
          input.userId,
        );
      }
    } catch {
      this.logger.debug("Unable to update human typing state");
    }
  }

  async setAiTyping(input: {
    organizationId: string;
    conversationId: string;
    triggerMessageId: string;
  }): Promise<void> {
    if (!(await this.ready())) return;
    try {
      await this.redis.set(
        this.aiKey(input.organizationId, input.conversationId),
        input.triggerMessageId,
        "EX",
        AI_TYPING_TTL_SECONDS,
      );
    } catch {
      this.logger.debug("Unable to update AI typing state");
    }
  }

  async clearAiTyping(organizationId: string, conversationId: string): Promise<void> {
    if (!(await this.ready())) return;
    try {
      await this.redis.del(this.aiKey(organizationId, conversationId));
    } catch {
      this.logger.debug("Unable to clear AI typing state");
    }
  }

  async clearHumanTyping(organizationId: string, conversationId: string): Promise<void> {
    if (!(await this.ready())) return;
    try {
      await this.redis.del(this.humanKey(organizationId, conversationId));
    } catch {
      this.logger.debug("Unable to clear human typing state");
    }
  }

  async getStatus(input: {
    organizationId: string;
    conversationId: string;
    allowHuman: boolean;
    allowAi: boolean;
  }): Promise<ConversationTypingStatus> {
    if (!(await this.ready())) return { kind: "none" };
    try {
      if (input.allowHuman && await this.redis.exists(
        this.humanKey(input.organizationId, input.conversationId),
      )) {
        return { kind: "human" };
      }
      if (input.allowAi && await this.redis.exists(
        this.aiKey(input.organizationId, input.conversationId),
      )) {
        return { kind: "ai" };
      }
    } catch {
      this.logger.debug("Unable to read typing state");
    }
    return { kind: "none" };
  }

  async onModuleDestroy() {
    if (this.redis.status === "ready") await this.redis.quit();
    else this.redis.disconnect();
  }
}
