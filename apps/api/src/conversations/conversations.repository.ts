import { Injectable } from "@nestjs/common";
import { db, contactSessions, conversations } from "@workspace/db/node";

import { and, desc, eq, asc, lt, or } from "drizzle-orm";

import type {
  ConversationStatus,
  NewContactSession,
  NewConversation,
} from "@workspace/db/node";

@Injectable()
export class ConversationsRepository {
  async createContactSession(data: NewContactSession) {
    const [result] = await db.insert(contactSessions).values(data).returning();

    return result;
  }

  listContactSessions(organizationId: string) {
    return db
      .select()
      .from(contactSessions)
      .where(eq(contactSessions.organizationId, organizationId))
      .orderBy(desc(contactSessions.createdAt))
      .limit(100);
  }

  async findContactSession(organizationId: string, id: string) {
    const [result] = await db
      .select()
      .from(contactSessions)
      .where(
        and(
          eq(contactSessions.organizationId, organizationId),
          eq(contactSessions.id, id),
        ),
      )
      .limit(1);

    return result ?? null;
  }

  async createConversation(data: NewConversation) {
    const [result] = await db.insert(conversations).values(data).returning();

    return result;
  }

  listConversations(organizationId: string) {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.organizationId, organizationId))
      .orderBy(desc(conversations.createdAt))
      .limit(100);
  }

  async findConversation(organizationId: string, id: string) {
    const [result] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.organizationId, organizationId),
          eq(conversations.id, id),
        ),
      )
      .limit(1);

    return result ?? null;
  }

  async updateStatus(
    organizationId: string,
    id: string,
    status: ConversationStatus,
  ) {
    const [result] = await db
      .update(conversations)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conversations.organizationId, organizationId),
          eq(conversations.id, id),
        ),
      )
      .returning();

    return result ?? null;
  }

  async listConversationPage(
    organizationId: string,
    options: {
      status?: ConversationStatus;
      cursor?: {
        createdAt: Date;
        id: string;
      };
      limit: number;
    },
  ) {
    const conditions = [eq(conversations.organizationId, organizationId)];

    if (options.status) {
      conditions.push(eq(conversations.status, options.status));
    }

    if (options.cursor) {
      conditions.push(
        or(
          lt(conversations.createdAt, options.cursor.createdAt),
          and(
            eq(conversations.createdAt, options.cursor.createdAt),
            lt(conversations.id, options.cursor.id),
          ),
        )!,
      );
    }

    return db
      .select({
        id: conversations.id,
        organizationId: conversations.organizationId,
        contactSessionId: conversations.contactSessionId,
        threadId: conversations.threadId,
        status: conversations.status,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        contactSession: {
          id: contactSessions.id,
          name: contactSessions.name,
          email: contactSessions.email,
          metadata: contactSessions.metadata,
          createdAt: contactSessions.createdAt,
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
      .where(and(...conditions))
      .orderBy(desc(conversations.createdAt), desc(conversations.id))
      .limit(options.limit + 1);
  }

  async findContactSessionByConversation(
    organizationId: string,
    conversationId: string,
  ) {
    const [result] = await db
      .select({
        id: contactSessions.id,
        organizationId: contactSessions.organizationId,
        name: contactSessions.name,
        email: contactSessions.email,
        metadata: contactSessions.metadata,
        expiresAt: contactSessions.expiresAt,
        createdAt: contactSessions.createdAt,
        updatedAt: contactSessions.updatedAt,
      })
      .from(conversations)
      .innerJoin(
        contactSessions,
        and(
          eq(conversations.contactSessionId, contactSessions.id),
          eq(conversations.organizationId, contactSessions.organizationId),
        ),
      )
      .where(
        and(
          eq(conversations.organizationId, organizationId),
          eq(conversations.id, conversationId),
        ),
      )
      .limit(1);

    return result ?? null;
  }
}
