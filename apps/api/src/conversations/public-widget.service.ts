import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
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

type ContactDetails = {
  name?: string;
  email?: string;
  phone?: string;
};

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
      .where(eq(contactSessions.sessionTokenHash, this.hashToken(token)))
      .limit(1);

    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Widget session expired or invalid");
    }

    return session;
  }

  private async requireOrganization(organizationId: string) {
    const [org] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    return org;
  }

  private async issueSession(organizationId: string, details?: ContactDetails) {
    await this.requireOrganization(organizationId);

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const identified = Boolean(details?.name?.trim() && details?.email?.trim());

    const [session] = await db
      .insert(contactSessions)
      .values({
        id: randomUUID(),
        organizationId,
        name: details?.name?.trim() || null,
        email: details?.email?.trim() || null,
        phone: details?.phone?.trim() || null,
        visitorType: identified ? "identified" : "guest",
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
      visitorType: session.visitorType,
    };
  }

  async createSession(input: {
    organizationId: string;
    name: string;
    email: string;
  }) {
    return this.issueSession(input.organizationId, {
      name: input.name,
      email: input.email,
    });
  }

  async createGuestSession(input: { organizationId: string }) {
    return this.issueSession(input.organizationId);
  }

  async validateSession(token: string) {
    const session = await this.requireSession(token);

    return {
      valid: true,
      contactSessionId: session.id,
      organizationId: session.organizationId,
      visitorType: session.visitorType,
      name: session.name,
      email: session.email,
      phone: session.phone,
      expiresAt: session.expiresAt,
    };
  }

  async updateSession(token: string, details: ContactDetails) {
    const session = await this.requireSession(token);

    const updates: ContactDetails = {};

    if (details.name !== undefined) {
      updates.name = details.name.trim();
    }

    if (details.email !== undefined) {
      updates.email = details.email.trim();
    }

    if (details.phone !== undefined) {
      updates.phone = details.phone.trim();
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException("At least one contact field is required");
    }

    const name = updates.name ?? session.name;
    const email = updates.email ?? session.email;

    const [updated] = await db
      .update(contactSessions)
      .set({
        ...updates,
        visitorType: name && email ? "identified" : "guest",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contactSessions.id, session.id),
          eq(contactSessions.organizationId, session.organizationId),
        ),
      )
      .returning();

    if (!updated) {
      throw new NotFoundException("Session not found");
    }

    return {
      contactSessionId: updated.id,
      organizationId: updated.organizationId,
      visitorType: updated.visitorType,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
    };
  }

  async createConversation(token: string) {
    const session = await this.requireSession(token);

    const [settings] = await db
      .select({
        greetMessage: widgetSettings.greetMessage,
      })
      .from(widgetSettings)
      .where(eq(widgetSettings.organizationId, session.organizationId))
      .limit(1);

    const conversationId = randomUUID();

    const greeting =
      settings?.greetMessage?.trim() ||
      "Xin chào! Chúng tôi có thể giúp gì cho bạn?";

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

  private async requireConversation(token: string, conversationId: string) {
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

  async listMessages(token: string, conversationId: string, before?: string) {
    const conversation = await this.requireConversation(token, conversationId);

    const beforeDate = before ? new Date(before) : null;

    if (beforeDate && Number.isNaN(beforeDate.getTime())) {
      throw new BadRequestException("Invalid before date");
    }

    const rows = await db
      .select()
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.organizationId, conversation.organizationId),
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
        rows.length > 50 && items[0] ? items[0].createdAt.toISOString() : null,
    };
  }

  async sendMessage(
    token: string,
    conversationId: string,
    content: string,
    clientMessageId: string,
  ) {
    const conversation = await this.requireConversation(token, conversationId);

    const trimmed = content.trim();

    if (!trimmed || trimmed.length > 5000) {
      throw new BadRequestException("Invalid message content");
    }

    // Giữ cơ chế phân quyền theo session/conversation.
    // Retry một tin nhắn đã lưu vẫn được trả về,
    // kể cả khi conversation đã resolved.
    const [existing] = await db
      .select()
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.organizationId, conversation.organizationId),
          eq(conversationMessages.conversationId, conversationId),
          eq(conversationMessages.clientMessageId, clientMessageId),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.role !== "user" || existing.content !== trimmed) {
        throw new ConflictException(
          "Client message ID already used with different content",
        );
      }

      return existing;
    }

    if (conversation.status === "resolved") {
      throw new ForbiddenException("Conversation resolved");
    }

    const [inserted] = await db
      .insert(conversationMessages)
      .values({
        id: randomUUID(),
        organizationId: conversation.organizationId,
        conversationId,
        role: "user",
        content: trimmed,
        clientMessageId,
      })
      .onConflictDoNothing({
        target: [
          conversationMessages.organizationId,
          conversationMessages.conversationId,
          conversationMessages.clientMessageId,
        ],
      })
      .returning();

    if (inserted) {
      return inserted;
    }

    // Một request khác đã INSERT cùng ID.
    // PostgreSQL unique index đảm bảo không tạo bản ghi thứ hai.
    const [saved] = await db
      .select()
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.organizationId, conversation.organizationId),
          eq(conversationMessages.conversationId, conversationId),
          eq(conversationMessages.clientMessageId, clientMessageId),
        ),
      )
      .limit(1);

    if (!saved) {
      throw new ConflictException("Unable to resolve duplicate message");
    }

    if (saved.role !== "user" || saved.content !== trimmed) {
      throw new ConflictException(
        "Client message ID already used with different content",
      );
    }

    return saved;
  }

  async getPublicConfiguration(organizationId: string) {
    const [org] = await db
      .select({
        id: organization.id,
        name: organization.name,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    const [settings] = await db
      .select({
        greetMessage: widgetSettings.greetMessage,
        defaultSuggestions: widgetSettings.defaultSuggestions,
        vapiAssistantId: widgetSettings.vapiAssistantId,
        vapiPhoneNumber: widgetSettings.vapiPhoneNumber,
      })
      .from(widgetSettings)
      .where(eq(widgetSettings.organizationId, organizationId))
      .limit(1);

    return {
      organization: org,
      settings: settings
        ? {
            organizationId,
            greetMessage: settings.greetMessage,
            defaultSuggestions: settings.defaultSuggestions,
            vapiSettings: {
              assistantId: settings.vapiAssistantId ?? undefined,
              phoneNumber: settings.vapiPhoneNumber ?? undefined,
            },
          }
        : {
            organizationId,
            greetMessage: "Xin chào! Chúng tôi có thể giúp gì cho bạn?",
            defaultSuggestions: {},
            vapiSettings: {},
          },
    };
  }
}
