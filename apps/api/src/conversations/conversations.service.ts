import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { randomUUID } from "node:crypto";

import type { RequestContext } from "../auth/request-context.js";

import { ConversationsRepository } from "./conversations.repository.js";

import {
  CreateContactSessionDto,
  CreateConversationDto,
  UpdateConversationStatusDto,
} from "./conversations.dto.js";

@Injectable()
export class ConversationsService {
  constructor(private readonly repository: ConversationsRepository) {}

  async createContactSession(
    context: RequestContext,
    dto: CreateContactSessionDto,
  ) {
    const expiresAt = new Date(dto.expiresAt);

    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new BadRequestException("expiresAt must be in the future");
    }

    return this.repository.createContactSession({
      id: randomUUID(),
      organizationId: context.organizationId,
      name: dto.name,
      email: dto.email,
      expiresAt,
    });
  }

  listContactSessions(context: RequestContext) {
    return this.repository.listContactSessions(context.organizationId);
  }

  async createConversation(
    context: RequestContext,
    dto: CreateConversationDto,
  ) {
    const contactSession = await this.repository.findContactSession(
      context.organizationId,
      dto.contactSessionId,
    );

    if (!contactSession) {
      throw new NotFoundException("Contact session not found");
    }

    if (contactSession.expiresAt <= new Date()) {
      throw new BadRequestException("Contact session expired");
    }

    return this.repository.createConversation({
      id: randomUUID(),
      organizationId: context.organizationId,
      contactSessionId: contactSession.id,
    });
  }

  listConversations(context: RequestContext) {
    return this.repository.listConversations(context.organizationId);
  }

  async getConversation(context: RequestContext, id: string) {
    const result = await this.repository.findConversation(
      context.organizationId,
      id,
    );

    if (!result) {
      throw new NotFoundException("Conversation not found");
    }

    return result;
  }

  async updateStatus(
    context: RequestContext,
    id: string,
    dto: UpdateConversationStatusDto,
  ) {
    const result = await this.repository.updateStatus(
      context.organizationId,
      id,
      dto.status,
    );

    if (!result) {
      throw new NotFoundException("Conversation not found");
    }

    return result;
  }

  async listConversationPage(
    context: RequestContext,
    options: {
      status?: "unresolved" | "escalated" | "resolved";
      cursor?: string;
      limit?: number;
    },
  ) {
    const limit = options.limit ?? 20;

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException("limit must be between 1 and 100");
    }

    let cursor: { createdAt: Date; id: string } | undefined;

    if (options.cursor) {
      try {
        const parsed = JSON.parse(
          Buffer.from(options.cursor, "base64url").toString("utf8"),
        ) as { createdAt: string; id: string };

        if (
          !parsed ||
          typeof parsed.id !== "string" ||
          !parsed.id ||
          typeof parsed.createdAt !== "string"
        ) {
          throw new Error("Invalid cursor");
        }

        const createdAt = new Date(parsed.createdAt);

        if (Number.isNaN(createdAt.getTime())) {
          throw new Error("Invalid cursor date");
        }

        cursor = { createdAt, id: parsed.id };
      } catch {
        throw new BadRequestException("Invalid pagination cursor");
      }
    }

    const rows = await this.repository.listConversationPage(
      context.organizationId,
      {
        status: options.status,
        cursor,
        limit,
      },
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    const last = items.at(-1);

    const nextCursor =
      hasMore && last
        ? Buffer.from(
            JSON.stringify({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            }),
          ).toString("base64url")
        : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  async getContactSessionByConversation(
    context: RequestContext,
    conversationId: string,
  ) {
    const result = await this.repository.findContactSessionByConversation(
      context.organizationId,
      conversationId,
    );

    if (!result) {
      throw new NotFoundException("Contact session not found");
    }

    return result;
  }
}
