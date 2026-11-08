import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
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
import { and, desc, eq, gt, lt, or } from "drizzle-orm";

import { PublicWidgetAiService } from "./public-widget-ai.service.js";
import { ConversationTypingService } from "./conversation-typing.service.js";
import { JobsService } from "../jobs/jobs.service.js";
import {
  decideReplyAction,
  type ReplyDecision,
  safeErrorSummary,
} from "./reply-guard.js";
import {
  newTraceId,
  ragTraceLog,
  runtimeFingerprint,
  type RagTrace,
} from "./rag-trace.js";

type ContactDetails = {
  name?: string;
  email?: string;
  phone?: string;
};

const AI_FALLBACK_MESSAGE =
  "Xin lỗi, hệ thống trả lời tự động đang tạm gián đoạn. " +
  "Mình đã chuyển cuộc trò chuyện đến nhân viên hỗ trợ. " +
  "Bạn có thể tiếp tục gửi thông tin tại đây.";

const HUMAN_HANDOFF_MESSAGE =
  "Mình đã chuyển yêu cầu của bạn đến nhân viên hỗ trợ. " +
  "Nhân viên sẽ phản hồi khi có thể. Bạn có thể tiếp tục gửi thông tin tại đây.";

@Injectable()
export class PublicWidgetService {
  private readonly logger = new Logger(PublicWidgetService.name);

  constructor(
    private readonly aiService: PublicWidgetAiService,
    private readonly jobsService: JobsService,
    private readonly typing: ConversationTypingService,
  ) {}

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

  async getTypingStatus(token: string, conversationId: string) {
    const conversation = await this.requireConversation(token, conversationId);
    const assignedToHuman = Boolean(conversation.assignedToUserId);

    return this.typing.getStatus({
      organizationId: conversation.organizationId,
      conversationId,
      allowHuman: assignedToHuman,
      allowAi: conversation.status === "unresolved" && !assignedToHuman,
    });
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

  /**
   * Worker entry point.
   *
   * Chỉ xử lý tin nhắn thuộc đúng organization/conversation.
   * Không gọi AI nếu hội thoại đã được nhân viên nhận.
   * Lỗi database được throw lại để BullMQ thực hiện retry.
   */
  async processAiReply(input: {
    organizationId: string;
    conversationId: string;
    triggerMessageId: string;
    trace?: RagTrace;
  }): Promise<void> {
    const { organizationId, conversationId, triggerMessageId, trace } = input;

    const skip = (reason: string) =>
      ragTraceLog(this.logger, "worker.skipped", trace, {
        organizationId,
        conversationId,
        triggerMessageId,
        reason,
      });

    await this.typing.setAiTyping({
      organizationId,
      conversationId,
      triggerMessageId,
    });

    try {
      const [triggerMessage] = await db
        .select({
          id: conversationMessages.id,
          createdAt: conversationMessages.createdAt,
        })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.id, triggerMessageId),
            eq(conversationMessages.organizationId, organizationId),
            eq(conversationMessages.conversationId, conversationId),
            eq(conversationMessages.role, "user"),
          ),
        )
        .limit(1);

      if (!triggerMessage) {
        this.logger.warn(
          `Customer support trigger message not found: ${triggerMessageId}`,
        );
        skip("trigger_message_not_found");
        return;
      }

      const [beforeGeneration] = await db
        .select({
          status: conversations.status,
          assignedToUserId: conversations.assignedToUserId,
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.organizationId, organizationId),
          ),
        )
        .limit(1);

      if (
        beforeGeneration?.status !== "unresolved" ||
        beforeGeneration.assignedToUserId
      ) {
        skip(
          beforeGeneration?.status !== "unresolved"
            ? `conversation_status_${beforeGeneration?.status ?? "missing"}`
            : "assigned_to_human",
        );
        return;
      }

      const [latestBefore] = await db
        .select({
          id: conversationMessages.id,
        })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.organizationId, organizationId),
            eq(conversationMessages.conversationId, conversationId),
            eq(conversationMessages.role, "user"),
          ),
        )
        .orderBy(
          desc(conversationMessages.createdAt),
          desc(conversationMessages.id),
        )
        .limit(1);

      if (latestBefore?.id !== triggerMessageId) {
        skip("superseded_before_generation");
        return;
      }

      const [alreadyProcessed] = await db
        .select({
          id: conversationMessages.id,
        })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.organizationId, organizationId),
            eq(conversationMessages.conversationId, conversationId),
            eq(conversationMessages.role, "assistant"),
            or(
              gt(conversationMessages.createdAt, triggerMessage.createdAt),
              and(
                eq(conversationMessages.createdAt, triggerMessage.createdAt),
                gt(conversationMessages.id, triggerMessageId),
              ),
            ),
          ),
        )
        .limit(1);

      if (alreadyProcessed) {
        skip("already_processed");
        return;
      }

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

      const reply = await this.aiService.generateReply(
        history.reverse(),
        organizationId,
        trace,
      );

      const decision: ReplyDecision = await db.transaction(async (tx) => {
        const [current] = await tx
          .select({
            status: conversations.status,
            assignedToUserId: conversations.assignedToUserId,
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

        // Nếu nhân viên đã claim trong lúc AI đang generate,
        // bỏ kết quả AI thay vì ghi đè luồng hỗ trợ của nhân viên.
        if (current?.assignedToUserId) {
          return "skip_superseded";
        }

        const [latestUser] = await tx
          .select({
            id: conversationMessages.id,
          })
          .from(conversationMessages)
          .where(
            and(
              eq(conversationMessages.organizationId, organizationId),
              eq(conversationMessages.conversationId, conversationId),
              eq(conversationMessages.role, "user"),
            ),
          )
          .orderBy(
            desc(conversationMessages.createdAt),
            desc(conversationMessages.id),
          )
          .limit(1);

        const [assistantAfterTrigger] = await tx
          .select({
            id: conversationMessages.id,
          })
          .from(conversationMessages)
          .where(
            and(
              eq(conversationMessages.organizationId, organizationId),
              eq(conversationMessages.conversationId, conversationId),
              eq(conversationMessages.role, "assistant"),
              or(
                gt(conversationMessages.createdAt, triggerMessage.createdAt),
                and(
                  eq(conversationMessages.createdAt, triggerMessage.createdAt),
                  gt(conversationMessages.id, triggerMessageId),
                ),
              ),
            ),
          )
          .limit(1);

        const action = decideReplyAction({
          status: current?.status,
          latestUserMessageId: latestUser?.id,
          triggerMessageId,
          reply,
          alreadyProcessed: Boolean(assistantAfterTrigger),
        });

        if (action === "save_reply" && reply) {
          await tx.insert(conversationMessages).values({
            id: randomUUID(),
            organizationId,
            conversationId,
            role: "assistant",
            content: reply.trim(),
          });
        }

        if (action === "handoff_fallback") {
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

          await tx.insert(conversationMessages).values({
            id: randomUUID(),
            organizationId,
            conversationId,
            role: "assistant",
            content: AI_FALLBACK_MESSAGE,
          });
        }

        return action;
      });

      // D: phân biệt "LLM trả lời đúng nhưng lưu sai" với các nhánh khác.
      ragTraceLog(this.logger, "worker.decision", trace, {
        organizationId,
        conversationId,
        triggerMessageId,
        decision,
        replyPresent: Boolean(reply?.trim()),
        replyLength: reply?.length ?? 0,
      });

      if (decision === "handoff_fallback") {
        this.logger.warn(
          `AI fallback activated for conversation ${conversationId}`,
        );
      } else if (decision === "skip_superseded") {
        this.logger.debug(
          `Discarded superseded AI result for conversation ${conversationId}`,
        );
      } else if (decision === "skip_already_processed") {
        this.logger.debug(
          `Skipped duplicate AI result for conversation ${conversationId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Could not process AI reply or fallback: ${safeErrorSummary(error)}`,
      );

      // Không nuốt lỗi: BullMQ cần nhận lỗi để thực hiện retry.
      throw error;
    } finally {
      await this.typing.clearAiTyping(organizationId, conversationId);
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

  /**
   * Chuyển hội thoại sang nhân viên.
   * Cập nhật trạng thái và lưu thông báo trong cùng transaction.
   */
  private async handoffToHuman(
    organizationId: string,
    conversationId: string,
  ): Promise<boolean> {
    try {
      return await db.transaction(async (tx) => {
        const [updated] = await tx
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
          )
          .returning({
            id: conversations.id,
          });

        if (!updated) {
          return false;
        }

        await tx.insert(conversationMessages).values({
          id: randomUUID(),
          organizationId,
          conversationId,
          role: "assistant",
          content: HUMAN_HANDOFF_MESSAGE,
        });

        return true;
      });
    } catch (error) {
      this.logger.error(
        `Could not hand off conversation to human: ${safeErrorSummary(error)}`,
      );
      return false;
    }
  }

  private async enqueueAiReply(
    organizationId: string,
    conversationId: string,
    triggerMessageId: string,
  ): Promise<void> {
    try {
      const traceId = newTraceId();
      const queued = await this.jobsService.enqueueCustomerSupportReply({
        organizationId,
        conversationId,
        triggerMessageId,
        traceId,
      });

      await this.typing.setAiTyping({
        organizationId,
        conversationId,
        triggerMessageId,
      });

      ragTraceLog(this.logger, "api.enqueued", { traceId, jobId: String(queued.jobId) }, {
        organizationId,
        conversationId,
        triggerMessageId,
        runtime: runtimeFingerprint(),
      });
    } catch (error) {
      this.logger.error(
        `Could not enqueue customer support reply: ${safeErrorSummary(error)}`,
      );

      throw new ServiceUnavailableException(
        "Message was saved but AI processing could not be queued. Retry using the same clientMessageId.",
      );
    }
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

      if (
        conversation.status === "unresolved" &&
        !conversation.assignedToUserId &&
        !this.isHumanSupportRequest(existing.content)
      ) {
        await this.enqueueAiReply(
          conversation.organizationId,
          conversationId,
          existing.id,
        );
      }

      return existing;
    }

    const result = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({
          status: conversations.status,
          assignedToUserId: conversations.assignedToUserId,
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.organizationId, conversation.organizationId),
          ),
        )
        .for("update")
        .limit(1);

      if (!locked) {
        return { kind: "not_found" as const };
      }

      if (locked.status === "resolved") {
        return { kind: "resolved" as const };
      }

      const [row] = await tx
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

      if (!row) {
        return { kind: "duplicate" as const };
      }

      return {
        kind: "inserted" as const,
        message: row,
        status: locked.status,
        assignedToUserId: locked.assignedToUserId,
      };
    });

    if (result.kind === "not_found") {
      throw new NotFoundException("Conversation not found");
    }

    if (result.kind === "resolved") {
      throw new ForbiddenException("Conversation resolved");
    }

    if (result.kind === "inserted") {
      if (result.status === "unresolved" && !result.assignedToUserId) {
        if (this.isHumanSupportRequest(trimmed)) {
          await this.typing.clearAiTyping(
            conversation.organizationId,
            conversationId,
          );
          await this.handoffToHuman(
            conversation.organizationId,
            conversationId,
          );
        } else {
          await this.enqueueAiReply(
            conversation.organizationId,
            conversationId,
            result.message.id,
          );
        }
      }

      return result.message;
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

    if (
      conversation.status === "unresolved" &&
      !conversation.assignedToUserId &&
      !this.isHumanSupportRequest(saved.content)
    ) {
      await this.enqueueAiReply(
        conversation.organizationId,
        conversationId,
        saved.id,
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
      })
      .from(widgetSettings)
      .where(eq(widgetSettings.organizationId, organizationId))
      .limit(1);

    return {
      organization: org,
      settings: {
        organizationId,
        greetMessage:
          settings?.greetMessage ??
          "Xin chào! Chúng tôi có thể giúp gì cho bạn?",
        defaultSuggestions: settings?.defaultSuggestions ?? {},
      },
    };
  }
}
