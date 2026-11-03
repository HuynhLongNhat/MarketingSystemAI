import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  db,
  conversations,
  contactSessions,
  member,
  user,
} from "@workspace/db/node";
import { and, desc, eq, isNull } from "drizzle-orm";

import type { RequestContext } from "../auth/request-context.js";

@Injectable()
export class HandoffService {
  async listQueue(
    context: RequestContext,
    filter: "all" | "unassigned" | "mine" = "all",
  ) {
    const conditions = [
      eq(conversations.organizationId, context.organizationId),
      eq(conversations.status, "escalated"),
    ];

    if (filter === "unassigned") {
      conditions.push(isNull(conversations.assignedToUserId));
    }

    if (filter === "mine") {
      conditions.push(eq(conversations.assignedToUserId, context.userId));
    }

    return db
      .select({
        id: conversations.id,
        organizationId: conversations.organizationId,
        status: conversations.status,
        assignedToUserId: conversations.assignedToUserId,
        assignedAt: conversations.assignedAt,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        contactSession: {
          id: contactSessions.id,
          name: contactSessions.name,
          email: contactSessions.email,
          phone: contactSessions.phone,
        },
        assignee: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(conversations)
      .innerJoin(
        contactSessions,
        and(
          eq(conversations.contactSessionId, contactSessions.id),
          eq(conversations.organizationId, contactSessions.organizationId),
        ),
      )
      .leftJoin(user, eq(conversations.assignedToUserId, user.id))
      .where(and(...conditions))
      .orderBy(desc(conversations.updatedAt))
      .limit(100);
  }

  async claim(context: RequestContext, conversationId: string) {
    return db.transaction(async (tx) => {
      const [conversation] = await tx
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.organizationId, context.organizationId),
          ),
        )
        .for("update")
        .limit(1);

      if (!conversation) {
        throw new NotFoundException("Conversation not found");
      }

      if (conversation.status !== "escalated") {
        throw new ConflictException(
          "Only escalated conversations can be claimed",
        );
      }

      if (conversation.assignedToUserId) {
        if (conversation.assignedToUserId === context.userId) {
          return conversation;
        }

        throw new ConflictException(
          "Conversation is already assigned to another member",
        );
      }

      const [updated] = await tx
        .update(conversations)
        .set({
          assignedToUserId: context.userId,
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.organizationId, context.organizationId),
            isNull(conversations.assignedToUserId),
          ),
        )
        .returning();

      if (!updated) {
        throw new ConflictException(
          "Conversation was claimed by another member",
        );
      }

      return updated;
    });
  }

  async assign(
    context: RequestContext,
    conversationId: string,
    targetUserId: string,
  ) {
    const [targetMember] = await db
      .select({
        userId: member.userId,
      })
      .from(member)
      .where(
        and(
          eq(member.organizationId, context.organizationId),
          eq(member.userId, targetUserId),
        ),
      )
      .limit(1);

    if (!targetMember) {
      throw new NotFoundException(
        "Target user is not a member of this organization",
      );
    }

    return db.transaction(async (tx) => {
      const [conversation] = await tx
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.organizationId, context.organizationId),
          ),
        )
        .for("update")
        .limit(1);

      if (!conversation) {
        throw new NotFoundException("Conversation not found");
      }

      if (conversation.status !== "escalated") {
        throw new ConflictException(
          "Only escalated conversations can be assigned",
        );
      }

      const [updated] = await tx
        .update(conversations)
        .set({
          assignedToUserId: targetUserId,
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.organizationId, context.organizationId),
          ),
        )
        .returning();

      if (!updated) {
        throw new NotFoundException("Conversation not found");
      }

      return updated;
    });
  }

  async release(context: RequestContext, conversationId: string) {
    return db.transaction(async (tx) => {
      const [conversation] = await tx
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.organizationId, context.organizationId),
          ),
        )
        .for("update")
        .limit(1);

      if (!conversation) {
        throw new NotFoundException("Conversation not found");
      }

      if (conversation.status !== "escalated") {
        throw new ConflictException(
          "Only escalated conversations can be released",
        );
      }

      if (!conversation.assignedToUserId) {
        return conversation;
      }

      const [updated] = await tx
        .update(conversations)
        .set({
          assignedToUserId: null,
          assignedAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.organizationId, context.organizationId),
          ),
        )
        .returning();

      if (!updated) {
        throw new NotFoundException("Conversation not found");
      }

      return updated;
    });
  }
}