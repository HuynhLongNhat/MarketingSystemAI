import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { aiTasks, ceoPlans, db } from "@workspace/db/node";
import type { RequestContext } from "../auth/request-context.js";
import { TasksService } from "../tasks/tasks.service.js";
import type { CreateCeoPlanDto, DecideCeoPlanDto } from "./ceo-planning.dto.js";
import { ceoPlanApprovalError } from "./ceo-plan-validation.js";

@Injectable()
export class CeoPlanningService {
  constructor(private readonly tasks: TasksService) {}
  private static readonly MAX_MANUAL_RETRIES = 2;
  private prompt(objective: string) {
    return `Lập kế hoạch cấp công ty NGẮN GỌN cho mục tiêu sau:\n${objective}\n\nƯu tiên hoàn thành đầy đủ cấu trúc trước khi thêm chi tiết. Trả lời bằng Markdown tiếng Việt, chỉ dùng đúng 7 mục theo đúng thứ tự này (không thêm heading khác):\n# Mục tiêu\n## Phân tích và bối cảnh\n## Giả định và rủi ro\n## Chiến lược đề xuất\n## Công việc đề xuất\n## Nhân viên AI phù hợp và lý do\n## Chỉ số theo dõi\n\nQuy tắc độ dài bắt buộc:\n- Mỗi mục ngoài bảng: tối đa 2 bullet ngắn; ưu tiên 1 câu/bullet.\n- Trong mục “Công việc đề xuất”, dùng đúng một bảng Markdown gồm 4 cột: Ưu tiên | Công việc | Kết quả mong đợi | Agent phù hợp. Bảng có tối đa 5 hàng công việc ưu tiên; mỗi ô là một cụm ngắn, không viết đoạn văn.\n- Không tạo bảng nào khác; không kéo dài phần giải thích sau bảng.\n- Nếu thiếu dữ liệu về ngân sách, nhân sự, thị trường hoặc nguồn lực, ghi rõ “Giả định:” thay vì bịa số liệu, ngân sách, nguồn lực hoặc nguồn tham khảo.\n- Hoàn thành đủ cả 7 mục, bao gồm “Chỉ số theo dõi”, trước khi bổ sung bất kỳ chi tiết nào.\n\nĐây chỉ là đề xuất để chủ công ty phê duyệt: không tự tạo, giao hoặc thực thi bất kỳ công việc nào.`;
  }
  private async createPlan(ctx: RequestContext, dto: CreateCeoPlanDto, retry?: { parentId: string; retryCount: number }) {
    const title = dto.title.trim(), objective = dto.objective.trim();
    if (!title || !objective) throw new BadRequestException("Mục tiêu và tiêu đề kế hoạch là bắt buộc.");
    const task = await this.tasks.create(ctx, { title: `Kế hoạch CEO: ${title}`, description: this.prompt(objective), agentId: dto.ceoAgentId });
    const [plan] = await db.insert(ceoPlans).values({
      id: randomUUID(), organizationId: ctx.organizationId, createdBy: ctx.userId,
      ceoAgentId: dto.ceoAgentId, taskId: task.id, title, objective,
      retryOfPlanId: retry?.parentId, retryCount: retry?.retryCount ?? 0,
    }).returning();
    if (!plan) throw new Error("Không thể lưu yêu cầu kế hoạch CEO.");
    return plan;
  }
  async create(ctx: RequestContext, dto: CreateCeoPlanDto) { return this.createPlan(ctx, dto); }
  async list(ctx: RequestContext) {
    const rows = await db.select({ plan: ceoPlans, taskStatus: aiTasks.status }).from(ceoPlans)
      .leftJoin(aiTasks, and(eq(aiTasks.id, ceoPlans.taskId), eq(aiTasks.organizationId, ceoPlans.organizationId)))
      .where(and(eq(ceoPlans.organizationId, ctx.organizationId), isNull(ceoPlans.deletedAt)))
      .orderBy(desc(ceoPlans.createdAt)).limit(100);
    return rows.map(({ plan, taskStatus }) => ({ ...plan, taskStatus }));
  }
  async get(ctx: RequestContext, id: string) {
    const [plan] = await db.select().from(ceoPlans).where(and(eq(ceoPlans.id, id), eq(ceoPlans.organizationId, ctx.organizationId), isNull(ceoPlans.deletedAt))).limit(1);
    if (!plan) throw new NotFoundException("Không tìm thấy kế hoạch CEO.");
    return plan;
  }
  async retry(ctx: RequestContext, id: string) {
    const plan = await this.get(ctx, id);
    const [task] = await db.select({ status: aiTasks.status }).from(aiTasks).where(and(eq(aiTasks.id, plan.taskId), eq(aiTasks.organizationId, ctx.organizationId))).limit(1);
    if (!task || task.status !== "failed") throw new BadRequestException("Chỉ có thể thử lại kế hoạch đã thất bại.");
    if (plan.retryCount >= CeoPlanningService.MAX_MANUAL_RETRIES) throw new BadRequestException("Kế hoạch này đã đạt giới hạn thử lại thủ công.");
    const [claimed] = await db.update(ceoPlans).set({ retryStartedAt: new Date(), updatedAt: new Date() }).where(and(
      eq(ceoPlans.id, plan.id), eq(ceoPlans.organizationId, ctx.organizationId), isNull(ceoPlans.retryStartedAt), isNull(ceoPlans.deletedAt),
    )).returning({ id: ceoPlans.id });
    if (!claimed) throw new BadRequestException("Một lần thử lại đang được tạo cho kế hoạch này.");
    try {
      const next = await this.createPlan(ctx, { ceoAgentId: plan.ceoAgentId, title: plan.title, objective: plan.objective }, { parentId: plan.id, retryCount: plan.retryCount + 1 });
      await db.update(ceoPlans).set({ retryPlanId: next.id, updatedAt: new Date() }).where(and(eq(ceoPlans.id, plan.id), eq(ceoPlans.organizationId, ctx.organizationId)));
      return next;
    } catch (error) {
      await db.update(ceoPlans).set({ retryStartedAt: null, updatedAt: new Date() }).where(and(eq(ceoPlans.id, plan.id), eq(ceoPlans.organizationId, ctx.organizationId), isNull(ceoPlans.retryPlanId)));
      throw error;
    }
  }
  async remove(ctx: RequestContext, id: string) {
    const plan = await this.get(ctx, id);
    const [task] = await db.select({ status: aiTasks.status }).from(aiTasks).where(and(eq(aiTasks.id, plan.taskId), eq(aiTasks.organizationId, ctx.organizationId))).limit(1);
    if (!task || task.status === "queued" || task.status === "running") throw new BadRequestException("Không thể xóa kế hoạch đang được CEO xử lý.");
    const [deleted] = await db.update(ceoPlans).set({ deletedAt: new Date(), deletedBy: ctx.userId, updatedAt: new Date() }).where(and(eq(ceoPlans.id, plan.id), eq(ceoPlans.organizationId, ctx.organizationId), isNull(ceoPlans.deletedAt))).returning({ id: ceoPlans.id });
    if (!deleted) throw new BadRequestException("Không thể xóa kế hoạch.");
    return { deleted: true };
  }
  async decide(ctx: RequestContext, id: string, dto: DecideCeoPlanDto) {
    const plan = await this.get(ctx, id);
    if (plan.approvalStatus !== "pending") throw new BadRequestException("Kế hoạch này đã được quyết định.");
    if (dto.decision === "approved") {
      const [task] = await db.select({ status: aiTasks.status, result: aiTasks.result }).from(aiTasks).where(and(eq(aiTasks.id, plan.taskId), eq(aiTasks.organizationId, ctx.organizationId))).limit(1);
      const reportError = ceoPlanApprovalError(task);
      if (reportError) throw new BadRequestException(`Không thể phê duyệt: ${reportError}`);
    }
    const [updated] = await db.update(ceoPlans).set({ approvalStatus: dto.decision, decisionNote: dto.note?.trim() || null, decidedBy: ctx.userId, decidedAt: new Date(), updatedAt: new Date() }).where(and(eq(ceoPlans.id, id), eq(ceoPlans.organizationId, ctx.organizationId), eq(ceoPlans.approvalStatus, "pending"))).returning();
    if (!updated) throw new BadRequestException("Không thể cập nhật quyết định kế hoạch.");
    return updated;
  }
}
