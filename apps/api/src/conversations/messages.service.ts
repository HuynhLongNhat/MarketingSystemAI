
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { randomUUID } from "node:crypto";

import type {
  RequestContext,
} from "../auth/request-context.js";

import { MessagesRepository } from "./messages.repository.js";

import {
  CreateMessageDto,
  ListMessagesQueryDto,
} from "./messages.dto.js";

@Injectable()
export class MessagesService {
  constructor(
    private readonly repository: MessagesRepository,
  ) {}

  async listMessages(
    context: RequestContext,
    conversationId: string,
    query: ListMessagesQueryDto,
  ) {
    const conversation =
      await this.repository.findConversation(
        context.organizationId,
        conversationId,
      );

    if (!conversation) {
      throw new NotFoundException(
        "Conversation not found",
      );
    }

    const limit = query.limit ?? 20;

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new BadRequestException(
        "limit must be between 1 and 100",
      );
    }

    let cursor:
      | { createdAt: Date; id: string }
      | undefined;

    if (query.cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(
            query.cursor,
            "base64url",
          ).toString("utf8"),
        ) as {
          createdAt?: unknown;
          id?: unknown;
        };

        if (
          !decoded ||
          typeof decoded.createdAt !== "string" ||
          typeof decoded.id !== "string" ||
          !decoded.id
        ) {
          throw new Error("Invalid cursor");
        }

        const createdAt = new Date(
          decoded.createdAt,
        );

        if (
          Number.isNaN(createdAt.getTime())
        ) {
          throw new Error("Invalid cursor date");
        }

        cursor = {
          createdAt,
          id: decoded.id,
        };
      } catch {
        throw new BadRequestException(
          "Invalid pagination cursor",
        );
      }
    }

    const rows = await this.repository.listPage(
      context.organizationId,
      conversationId,
      {
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
              createdAt:
                last.createdAt.toISOString(),
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

  async createOperatorMessage(
    context: RequestContext,
    conversationId: string,
    dto: CreateMessageDto,
  ) {
    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException(
        "Message cannot be empty",
      );
    }

    const result =
      await this.repository.createOperatorMessage({
        id: randomUUID(),
        organizationId: context.organizationId,
        conversationId,
        role: "assistant",
        content,
        senderId: context.userId,
      });

    if (result.outcome === "not_found") {
      throw new NotFoundException(
        "Conversation not found",
      );
    }

    if (result.outcome === "resolved") {
      throw new BadRequestException(
        "Cannot reply to a resolved conversation",
      );
    }

    return result.message;
  }

  
  async getAccessibleConversation(
    context: RequestContext,
    conversationId: string,
  ) {
    const conversation =
      await this.repository.findConversation(
        context.organizationId,
        conversationId,
      );

    if (!conversation) {
      throw new NotFoundException(
        "Conversation not found",
      );
    }

    if (conversation.status === "resolved") {
      throw new BadRequestException(
        "Cannot enhance a resolved conversation",
      );
    }

    return conversation;
  }

}
