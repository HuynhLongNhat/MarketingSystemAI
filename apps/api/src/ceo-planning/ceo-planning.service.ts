import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { ceoPlans, db } from "@workspace/db/node";
import type { RequestContext } from "../auth/request-context.js";
import { TasksService } from "../tasks/tasks.service.js";
import type { CreateCeoPlanDto, DecideCeoPlanDto } from "./ceo-planning.dto.js";

@Injectable()
export class CeoPlanningService {
  constructor(private readonly tasks: TasksService) {}
  private prompt(objective: string) {
    return `Lập kế hoạch cấp công ty cho mục tiêu sau:\n${objective}\n\nTrả lời bằng Markdown tiếng Việt, có đúng các phần: # Mục tiêu; ## Phân tích và bối cảnh; ## Giả định và rủi ro; ## Chiến lược đề xuất; ## Công việc đề xuất; ## Nhân viên AI phù hợp và lý do; ## Chỉ số theo dõi. Với mỗi công việc đề xuất, nêu mục tiêu, kết quả mong đợi, nhân viên/role phù hợp và lý do. Đây chỉ là đề xuất để chủ công ty phê duyệt: không tự tạo, giao hoặc thực thi bất kỳ công việc nào.`;
  }
  async create(ctx: RequestContext, dto: CreateCeoPlanDto) {
    const title = dto.title.trim(), objective = dto.objective.trim();
    if (!title || !objective) throw new BadRequestException("Mục tiêu và tiêu đề kế hoạch là bắt buộc.");
    const task = await this.tasks.create(ctx, { title: `Kế hoạch CEO: ${title}`, description: this.prompt(objective), agentId: dto.ceoAgentId });
    const [plan] = await db.insert(ceoPlans).values({ id: randomUUID(), organizationId: ctx.organizationId, createdBy: ctx.userId, ceoAgentId: dto.ceoAgentId, taskId: task.id, title, objective }).returning();
    if (!plan) throw new Error("Không thể lưu yêu cầu kế hoạch CEO.");
    return plan;
  }
  async list(ctx: RequestContext) { return db.select().from(ceoPlans).where(eq(ceoPlans.organizationId, ctx.organizationId)).orderBy(desc(ceoPlans.createdAt)).limit(100); }
  async get(ctx: RequestContext, id: string) { const [plan] = await db.select().from(ceoPlans).where(and(eq(ceoPlans.id, id), eq(ceoPlans.organizationId, ctx.organizationId))).limit(1); if (!plan) throw new NotFoundException("Không tìm thấy kế hoạch CEO."); return plan; }
  async decide(ctx: RequestContext, id: string, dto: DecideCeoPlanDto) {
    const plan = await this.get(ctx, id);
    if (plan.approvalStatus !== "pending") throw new BadRequestException("Kế hoạch này đã được quyết định.");
    const [updated] = await db.update(ceoPlans).set({ approvalStatus: dto.decision, decisionNote: dto.note?.trim() || null, decidedBy: ctx.userId, decidedAt: new Date(), updatedAt: new Date() }).where(and(eq(ceoPlans.id, id), eq(ceoPlans.organizationId, ctx.organizationId), eq(ceoPlans.approvalStatus, "pending"))).returning();
    if (!updated) throw new BadRequestException("Không thể cập nhật quyết định kế hoạch.");
    return updated;
  }
}
