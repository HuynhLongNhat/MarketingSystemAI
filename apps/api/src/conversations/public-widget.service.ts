import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
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

import { PublicWidgetAiService } from "./public-widget-ai.service.js";

type ContactDetails = {
  name?: string;
  email?: string;
  phone?: string;
};

@Injectable()
export class PublicWidgetService {
  private readonly logger = new Logger(PublicWidgetService.name);

  constructor(private readonly aiService: PublicWidgetAiService) {}

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

    const [conversation] = await db
      .insert(conversations)
      .values({
        id: randomUUID(),
        organizationId: session.organizationId,
        contactSessionId: session.id,
        status: "unresolved",
      })
      .returning();

    return conversation;
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

  private async replyWithAi(
    organizationId: string,
    conversationId: string,
  ): Promise<void> {
    const fallbackMessage =
      "Xin lỗi, hệ thống trả lời tự động đang tạm gián đoạn. " +
      "Mình đã chuyển cuộc trò chuyện đến nhân viên hỗ trợ. " +
      "Bạn có thể tiếp tục gửi thông tin tại đây.";

    try {
      // 1. Chỉ gọi AI khi hội thoại đang được AI xử lý.
      const [beforeGeneration] = await db
        .select({
          status: conversations.status,
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.organizationId, organizationId),
          ),
        )
        .limit(1);

      if (beforeGeneration?.status !== "unresolved") {
        return;
      }

      // 2. Đọc lịch sử trong đúng Organization.
      const history = await db
        .select({
          role: conversationMessages.role,
          content: conversationMessages.content,
        })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.organizationId, organizationId),
            eq(conversationMessages.conversationId, conversationId),
          ),
        )
        .orderBy(
          desc(conversationMessages.createdAt),
          desc(conversationMessages.id),
        )
        .limit(12);

      // 3. Gọi AI, giữ nguyên Knowledge Base Injection.
      const reply = await this.aiService.generateReply(
        history.reverse(),
        organizationId,
      );

      // 4. Ghi kết quả trong transaction.
      // Lock hội thoại để tránh AI và nhân viên cùng
      // thay đổi trạng thái trong lúc lưu phản hồi.
      await db.transaction(async (tx) => {
        const [currentConversation] = await tx
          .select({
            status: conversations.status,
          })
          .from(conversations)
          .where(
            and(
              eq(conversations.id, conversationId),
              eq(conversations.organizationId, organizationId),
            ),
          )
          .for("update")
          .limit(1);

        // Nếu nhân viên đã tiếp quản hoặc kết thúc,
        // không gửi thêm phản hồi tự động.
        if (currentConversation?.status !== "unresolved") {
          return;
        }

        if (reply?.trim()) {
          // AI thành công: lưu phản hồi như cũ.
          await tx.insert(conversationMessages).values({
            id: randomUUID(),
            organizationId,
            conversationId,
            role: "assistant",
            content: reply.trim(),
          });

          return;
        }

        // 5. AI lỗi: chuyển sang nhân viên.
        await tx
          .update(conversations)
          .set({
            status: "escalated",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(conversations.id, conversationId),
              eq(conversations.organizationId, organizationId),
              eq(conversations.status, "unresolved"),
            ),
          );

        // 6. Thông báo rõ ràng cho khách.
        await tx.insert(conversationMessages).values({
          id: randomUUID(),
          organizationId,
          conversationId,
          role: "assistant",
          content: fallbackMessage,
        });
      });

      if (!reply?.trim()) {
        this.logger.warn(
          `AI fallback activated for conversation ${conversationId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        "Could not process AI reply or fallback",
        error instanceof Error ? (error.stack ?? error.message) : String(error),
      );
    }
  }

  private isHumanSupportRequest(content: string): boolean {
    const normalized = content
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[.,!?;:]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const requests = [
      /\b(muon|can|cho|xin|yeu cau)\s+(duoc\s+)?(gap|noi chuyen voi|chat voi|lien he voi)\s+(nhan vien|nguoi that|tu van vien|tong dai vien)\b/,
      /\b(chuyen|ket noi)\s+(toi|sang|cho)\s+(nhan vien|tu van vien|tong dai vien)\b/,
      /\b(gap|goi)\s+(nhan vien|tu van vien|tong dai vien)\s+(ho tro|tu van)?\b/,
      /\b(human agent|live agent|real person|talk to a person)\b/,
    ];

    if (
      /\b(khong muon|khong can|chua can|dung|thoi)\s+(gap|noi chuyen voi|chuyen)\b/.test(
        normalized,
      )
    ) {
      return false;
    }

    return requests.some((pattern) => pattern.test(normalized));
  }

  private async handoffToHuman(
    organizationId: string,
    conversationId: string,
  ): Promise<boolean> {
    const [updated] = await db
      .update(conversations)
      .set({
        status: "escalated",
      })
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.organizationId, organizationId),
          eq(conversations.status, "unresolved"),
        ),
      )
      .returning({
        id: conversations.id,
      });

    if (!updated) {
      return false;
    }

    await db.insert(conversationMessages).values({
      id: randomUUID(),
      organizationId,
      conversationId,
      role: "assistant",
      content:
        "Mình đã chuyển yêu cầu của bạn đến nhân viên hỗ trợ. " +
        "Nhân viên sẽ phản hồi khi có thể. Bạn có thể tiếp tục gửi thông tin tại đây.",
    });

    return true;
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

    const messageIdentity = and(
      eq(conversationMessages.organizationId, conversation.organizationId),
      eq(conversationMessages.conversationId, conversationId),
      eq(conversationMessages.clientMessageId, clientMessageId),
    );

    const [existing] = await db
      .select()
      .from(conversationMessages)
      .where(messageIdentity)
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
      if (conversation.status === "unresolved") {
        if (this.isHumanSupportRequest(trimmed)) {
          await this.handoffToHuman(
            conversation.organizationId,
            conversationId,
          );
        } else {
          await this.replyWithAi(conversation.organizationId, conversationId);
        }
      }

      return inserted;
    }

    const [saved] = await db
      .select()
      .from(conversationMessages)
      .where(messageIdentity)
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
