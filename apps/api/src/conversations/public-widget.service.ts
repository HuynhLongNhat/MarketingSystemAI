
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  db,
  organization,
  contactSessions,
  conversations,
  conversationMessages,
  widgetSettings,
} from "@workspace/db/node";
import { and, desc, eq, lt } from "drizzle-orm";

@Injectable()
export class PublicWidgetService {
  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private async requireSession(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw new UnauthorizedException("Invalid widget session");
    }

    const [session] = await db
      .select()
      .from(contactSessions)
      .where(
        eq(contactSessions.sessionTokenHash, this.hashToken(token)),
      )
      .limit(1);

    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Widget session expired or invalid");
    }

    return session;
  }

  async createSession(input: {
    organizationId: string;
    name: string;
    email: string;
  }) {
    const [org] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, input.organizationId))
      .limit(1);

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );

    const [session] = await db
      .insert(contactSessions)
      .values({
        id: randomUUID(),
        organizationId: input.organizationId,
        name: input.name,
        email: input.email,
        expiresAt,
        sessionTokenHash: this.hashToken(token),
      })
      .returning();

    if (!session) {
      throw new BadRequestException("Cannot create session");
    }

    return {
      contactSessionId: session.id,
      token,
      expiresAt: session.expiresAt,
    };
  }

  async validateSession(token: string) {
    const session = await this.requireSession(token);

    return {
      valid: true,
      contactSessionId: session.id,
      organizationId: session.organizationId,
    };
  }

  async createConversation(token: string) {
    const session = await this.requireSession(token);

    const [settings] = await db
      .select({ greetMessage: widgetSettings.greetMessage })
      .from(widgetSettings)
      .where(
        eq(widgetSettings.organizationId, session.organizationId),
      )
      .limit(1);

    const conversationId = randomUUID();
    const greeting =
      settings?.greetMessage?.trim() ||
      "Hello, how can I help you today?";

    return db.transaction(async (tx) => {
      const [conversation] = await tx
        .insert(conversations)
        .values({
          id: conversationId,
          organizationId: session.organizationId,
          contactSessionId: session.id,
          status: "unresolved",
        })
        .returning();

      await tx.insert(conversationMessages).values({
        id: randomUUID(),
        organizationId: session.organizationId,
        conversationId,
        role: "assistant",
        content: greeting,
      });

      return conversation;
    });
  }

  private async requireConversation(
    token: string,
    conversationId: string,
  ) {
    const session = await this.requireSession(token);

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.organizationId, session.organizationId),
          eq(conversations.contactSessionId, session.id),
        ),
      )
      .limit(1);

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    return conversation;
  }

  async listConversations(token: string) {
    const session = await this.requireSession(token);

    return db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.organizationId, session.organizationId),
          eq(conversations.contactSessionId, session.id),
        ),
      )
      .orderBy(desc(conversations.createdAt))
      .limit(50);
  }

  async getConversation(token: string, conversationId: string) {
    return this.requireConversation(token, conversationId);
  }

  async listMessages(
    token: string,
    conversationId: string,
    before?: string,
  ) {
    const conversation = await this.requireConversation(
      token,
      conversationId,
    );

    const beforeDate = before ? new Date(before) : null;

    if (beforeDate && Number.isNaN(beforeDate.getTime())) {
      throw new BadRequestException("Invalid before date");
    }

    const rows = await db
      .select()
      .from(conversationMessages)
      .where(
        and(
          eq(
            conversationMessages.organizationId,
            conversation.organizationId,
          ),
          eq(conversationMessages.conversationId, conversationId),
          beforeDate
            ? lt(conversationMessages.createdAt, beforeDate)
            : undefined,
        ),
      )
      .orderBy(
        desc(conversationMessages.createdAt),
        desc(conversationMessages.id),
      )
      .limit(51);

    const items = rows.slice(0, 50).reverse();

    return {
      items,
      hasMore: rows.length > 50,
      nextBefore:
        rows.length > 50 && items[0]
          ? items[0].createdAt.toISOString()
          : null,
    };
  }

  async sendMessage(
    token: string,
    conversationId: string,
    content: string,
  ) {
    const conversation = await this.requireConversation(
      token,
      conversationId,
    );

    if (conversation.status === "resolved") {
      throw new ForbiddenException("Conversation resolved");
    }

    const trimmed = content.trim();

    if (!trimmed || trimmed.length > 5000) {
      throw new BadRequestException("Invalid message content");
    }

    const [message] = await db
      .insert(conversationMessages)
      .values({
        id: randomUUID(),
        organizationId: conversation.organizationId,
        conversationId,
        role: "user",
        content: trimmed,
      })
      .returning();

    return message;
  }
}
