
import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  aiUsageLogs,
  aiUsageQuotas,
  aiUsageReservations,
  db,
} from "@workspace/db/node";
import {
  and,
  eq,
  gt,
  gte,
  lt,
  sql,
} from "drizzle-orm";

import type { RequestContext } from "../auth/request-context.js";
import { tenantWhere } from "../common/tenant/tenant-query.js";
import type { UpdateAiUsageQuotaDto } from "./ai-usage-quota.dto.js";

function getUtcMonthPeriod(now: Date) {
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  return { periodStart, periodEnd };
}

function parseAggregate(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Invalid AI usage aggregate returned by database");
  }

  return Math.floor(parsed);
}

@Injectable()
export class AiUsageQuotaManagementService {
  async getCurrent(context: RequestContext) {
    const now = new Date();
    const { periodStart, periodEnd } = getUtcMonthPeriod(now);

    const [quota] = await db
      .select({
        id: aiUsageQuotas.id,
        monthlyTokenLimit: aiUsageQuotas.monthlyTokenLimit,
        createdAt: aiUsageQuotas.createdAt,
        updatedAt: aiUsageQuotas.updatedAt,
      })
      .from(aiUsageQuotas)
      .where(
        tenantWhere(
          context,
          aiUsageQuotas.organizationId,
        ),
      )
      .limit(1);

    const [usageRow] = await db
      .select({
        total: sql<string>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)::text`,
      })
      .from(aiUsageLogs)
      .where(
        and(
          tenantWhere(
            context,
            aiUsageLogs.organizationId,
          ),
          gte(aiUsageLogs.createdAt, periodStart),
          lt(aiUsageLogs.createdAt, periodEnd),
        ),
      );

    const [reservationRow] = await db
      .select({
        total: sql<string>`coalesce(sum(${aiUsageReservations.reservedTokens}), 0)::text`,
      })
      .from(aiUsageReservations)
      .where(
        and(
          tenantWhere(
            context,
            aiUsageReservations.organizationId,
          ),
          eq(
            aiUsageReservations.periodStart,
            periodStart,
          ),
          gt(aiUsageReservations.expiresAt, now),
        ),
      );

    const usedTokens = parseAggregate(usageRow?.total);
    const reservedTokens = parseAggregate(reservationRow?.total);
    const monthlyTokenLimit = quota?.monthlyTokenLimit ?? null;

    return {
      configured: quota !== undefined,
      monthlyTokenLimit,
      usedTokens,
      reservedTokens,
      projectedUsage: usedTokens + reservedTokens,
      remainingTokens:
        monthlyTokenLimit === null
          ? null
          : Math.max(
              0,
              monthlyTokenLimit - usedTokens - reservedTokens,
            ),
      periodStart,
      periodEnd,
      updatedAt: quota?.updatedAt ?? null,
    };
  }

  async updateCurrent(
    context: RequestContext,
    dto: UpdateAiUsageQuotaDto,
  ) {
    const monthlyTokenLimit = dto.monthlyTokenLimit;

    const [quota] = await db
      .insert(aiUsageQuotas)
      .values({
        id: randomUUID(),
        organizationId: context.organizationId,
        monthlyTokenLimit,
      })
      .onConflictDoUpdate({
        target: aiUsageQuotas.organizationId,
        set: {
          monthlyTokenLimit,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: aiUsageQuotas.id,
        monthlyTokenLimit: aiUsageQuotas.monthlyTokenLimit,
        createdAt: aiUsageQuotas.createdAt,
        updatedAt: aiUsageQuotas.updatedAt,
      });

    if (!quota) {
      throw new Error("Failed to save AI usage quota");
    }

    return {
      configured: true,
      ...quota,
    };
  }

  async removeCurrent(context: RequestContext) {
    const deleted = await db
      .delete(aiUsageQuotas)
      .where(
        tenantWhere(
          context,
          aiUsageQuotas.organizationId,
        ),
      )
      .returning({
        id: aiUsageQuotas.id,
      });

    if (deleted.length === 0) {
      throw new NotFoundException(
        "AI usage quota is not configured",
      );
    }

    return {
      deleted: true,
      configured: false,
      message: "AI usage quota removed. The organization is now unlimited.",
    };
  }
}
