import { BadRequestException, Injectable } from "@nestjs/common";
import { businessProfiles, db } from "@workspace/db/node";
import { eq } from "drizzle-orm";
import type { RequestContext } from "../auth/request-context.js";
import type { UpdateBusinessProfileDto } from "./business-profile.dto.js";
@Injectable()
export class BusinessProfileService {
  getCurrent(ctx: RequestContext) { return db.select().from(businessProfiles).where(eq(businessProfiles.organizationId, ctx.organizationId)).limit(1).then(([profile]) => profile ?? null); }
  async updateCurrent(ctx: RequestContext, dto: UpdateBusinessProfileDto) {
    const current = await this.getCurrent(ctx);
    const marketingBudgetVnd = dto.marketingBudgetVnd === undefined ? current?.marketingBudgetVnd ?? null : dto.marketingBudgetVnd;
    const paidAdsBudgetVnd = dto.paidAdsBudgetVnd === undefined ? current?.paidAdsBudgetVnd ?? null : dto.paidAdsBudgetVnd;
    if (marketingBudgetVnd !== null && paidAdsBudgetVnd !== null && paidAdsBudgetVnd > marketingBudgetVnd) throw new BadRequestException("Ngân sách quảng cáo trả phí không thể vượt tổng ngân sách Marketing trong cùng kỳ.");
    const text = (value: string | null | undefined, fallback: string | null | undefined) => value === undefined ? fallback ?? null : value?.trim() || null;
    const values = { organizationId: ctx.organizationId, currency: "VND", businessName: text(dto.businessName, current?.businessName), primaryIndustry: text(dto.primaryIndustry, current?.primaryIndustry), businessModel: dto.businessModel === undefined ? current?.businessModel ?? null : dto.businessModel, productsServices: dto.productsServices ?? current?.productsServices ?? [], targetCustomers: text(dto.targetCustomers, current?.targetCustomers), markets: dto.markets ?? current?.markets ?? [], competitiveAdvantages: dto.competitiveAdvantages ?? current?.competitiveAdvantages ?? [], priorityBusinessGoals: dto.priorityBusinessGoals ?? current?.priorityBusinessGoals ?? [], currentChallenges: dto.currentChallenges ?? current?.currentChallenges ?? [], developmentStage: dto.developmentStage === undefined ? current?.developmentStage ?? null : dto.developmentStage, marketingBudgetVnd, paidAdsBudgetVnd, budgetPeriodDays: dto.budgetPeriodDays === undefined ? current?.budgetPeriodDays ?? null : dto.budgetPeriodDays, teamSize: dto.teamSize === undefined ? current?.teamSize ?? null : dto.teamSize, availableHoursPerWeek: dto.availableHoursPerWeek === undefined ? current?.availableHoursPerWeek ?? null : dto.availableHoursPerWeek, availableTools: dto.availableTools ?? current?.availableTools ?? [], availableChannels: dto.availableChannels ?? current?.availableChannels ?? [], riskTolerance: dto.riskTolerance ?? current?.riskTolerance ?? "balanced", constraintsNote: text(dto.constraintsNote, current?.constraintsNote), updatedAt: new Date() };
    const [profile] = await db.insert(businessProfiles).values(values).onConflictDoUpdate({ target: businessProfiles.organizationId, set: values }).returning();
    return profile!;
  }
}
