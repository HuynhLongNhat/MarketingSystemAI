
import { Injectable } from "@nestjs/common";

import {
  db,
  conversations,
  conversationMessages,
} from "@workspace/db/node";

import type {
  NewConversationMessage,
} from "@workspace/db/node";

import {
  and,
  desc,
  eq,
  lt,
  or,
} from "drizzle-orm";

@Injectable()
export class MessagesRepository {
  async findConversation(
    organizationId: string,
    conversationId: string,
  ) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.organizationId, organizationId),
          eq(conversations.id, conversationId),
        ),
      )
      .limit(1);

    return conversation ?? null;
  }

  async listPage(
    organizationId: string,
    conversationId: string,
    options: {
      cursor?: {
        createdAt: Date;
        id: string;
      };
      limit: number;
    },
  ) {
    const conditions = [
      eq(conversationMessages.organizationId, organizationId),
      eq(conversationMessages.conversationId, conversationId),
    ];

    if (options.cursor) {
      conditions.push(
        or(
          lt(
            conversationMessages.createdAt,
            options.cursor.createdAt,
          ),
          and(
            eq(
              conversationMessages.createdAt,
              options.cursor.createdAt,
            ),
            lt(
              conversationMessages.id,
              options.cursor.id,
            ),
          ),
        )!,
      );
    }

    return db
      .select()
      .from(conversationMessages)
      .where(and(...conditions))
      .orderBy(
        desc(conversationMessages.createdAt),
        desc(conversationMessages.id),
      )
      .limit(options.limit + 1);
  }

  async createOperatorMessage(
    data: NewConversationMessage,
  ) {
    return db.transaction(async (tx) => {
      // Lock conversation để tránh gửi vào hội thoại
      // vừa bị resolved bởi request khác.
      const [conversation] = await tx
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.organizationId, data.organizationId),
            eq(conversations.id, data.conversationId),
          ),
        )
        .for("update")
        .limit(1);

      if (!conversation) {
        return {
          outcome: "not_found" as const,
        };
      }

      if (conversation.status === "resolved") {
        return {
          outcome: "resolved" as const,
        };
      }

      const [message] = await tx
        .insert(conversationMessages)
        .values(data)
        .returning();

      if (!message) {
        throw new Error("Failed to create message");
      }

      if (conversation.status === "unresolved") {
        await tx
          .update(conversations)
          .set({
            status: "escalated",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(conversations.organizationId, data.organizationId),
              eq(conversations.id, data.conversationId),
            ),
          );
      }

      return {
        outcome: "created" as const,
        message,
      };
    });
  }
}
