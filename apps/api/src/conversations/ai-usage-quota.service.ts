
import { Injectable } from "@nestjs/common";
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

const TEMPORARY_RESERVATION_MS = 2 * 60 * 1000;
const MAX_DATABASE_INTEGER = 2_147_483_647;

export type AiQuotaReservationResult =
  | {
      limited: false;
      reservationId: null;
    }
  | {
      limited: true;
      allowed: true;
      reservationId: string;
      periodStart: Date;
      periodEnd: Date;
      monthlyTokenLimit: number;
      usedTokens: number;
      reservedTokens: number;
    }
  | {
      limited: true;
      allowed: false;
      monthlyTokenLimit: number;
      usedTokens: number;
      reservedTokens: number;
      requestedTokens: number;
    };

export type AiQuotaSettlement =
  | {
      reservationId: string;
      organizationId: string;
      outcome: "release";
    }
  | {
      reservationId: string;
      organizationId: string;
      outcome: "retain";
    };

function getUtcMonthPeriod(now: Date): {
  periodStart: Date;
  periodEnd: Date;
} {
  const periodStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1,
      0,
      0,
      0,
      0,
    ),
  );

  const periodEnd = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    ),
  );

  return {
    periodStart,
    periodEnd,
  };
}

function parseAggregate(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Invalid AI usage aggregate returned by database");
  }

  return Math.min(Math.floor(parsed), Number.MAX_SAFE_INTEGER);
}

function validateTokenEstimate(value: number): number {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > MAX_DATABASE_INTEGER
  ) {
    throw new Error("Invalid AI token reservation estimate");
  }

  return value;
}

@Injectable()
export class AiUsageQuotaService {
  /**
   * Reserve tokens before calling an AI provider.
   *
   * A missing quota row means the organization is unlimited.
   * The quota row lock serializes reservations for the same organization.
   */
  async reserve(
    organizationId: string,
    requestedTokens: number,
  ): Promise<AiQuotaReservationResult> {
    const tokenEstimate = validateTokenEstimate(requestedTokens);
    const now = new Date();
    const { periodStart, periodEnd } = getUtcMonthPeriod(now);

    return db.transaction(async (tx) => {
      const [quota] = await tx
        .select({
          monthlyTokenLimit: aiUsageQuotas.monthlyTokenLimit,
        })
        .from(aiUsageQuotas)
        .where(eq(aiUsageQuotas.organizationId, organizationId))
        .for("update")
        .limit(1);

      if (!quota) {
        return {
          limited: false,
          reservationId: null,
        };
      }

      const [usageRow] = await tx
        .select({
          total: sql<string>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)::text`,
        })
        .from(aiUsageLogs)
        .where(
          and(
            eq(aiUsageLogs.organizationId, organizationId),
            gte(aiUsageLogs.createdAt, periodStart),
            lt(aiUsageLogs.createdAt, periodEnd),
          ),
        );

      const [reservationRow] = await tx
        .select({
          total: sql<string>`coalesce(sum(${aiUsageReservations.reservedTokens}), 0)::text`,
        })
        .from(aiUsageReservations)
        .where(
          and(
            eq(
              aiUsageReservations.organizationId,
              organizationId,
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
      const monthlyTokenLimit = quota.monthlyTokenLimit;

      const projectedUsage =
        usedTokens + reservedTokens + tokenEstimate;

      if (projectedUsage > monthlyTokenLimit) {
        return {
          limited: true,
          allowed: false,
          monthlyTokenLimit,
          usedTokens,
          reservedTokens,
          requestedTokens: tokenEstimate,
        };
      }

      const reservationId = randomUUID();

      const temporaryExpiry = new Date(
        now.getTime() + TEMPORARY_RESERVATION_MS,
      );

      const expiresAt =
        temporaryExpiry < periodEnd
          ? temporaryExpiry
          : periodEnd;

      await tx.insert(aiUsageReservations).values({
        id: reservationId,
        organizationId,
        periodStart,
        reservedTokens: tokenEstimate,
        expiresAt,
      });

      return {
        limited: true,
        allowed: true,
        reservationId,
        periodStart,
        periodEnd,
        monthlyTokenLimit,
        usedTokens,
        reservedTokens: reservedTokens + tokenEstimate,
      };
    });
  }

  /**
   * Release a reservation after usage has been safely recorded.
   */
  async release(
    organizationId: string,
    reservationId: string,
  ): Promise<void> {
    await this.settle({
      organizationId,
      reservationId,
      outcome: "release",
    });
  }

  /**
   * Keep a reservation until the end of its billing month.
   *
   * Use this when usage cannot be reliably recorded or measured.
   * This intentionally favors preventing quota bypass over
   * undercounting provider usage.
   */
  async retainUntilPeriodEnd(
    organizationId: string,
    reservationId: string,
  ): Promise<void> {
    await this.settle({
      organizationId,
      reservationId,
      outcome: "retain",
    });
  }

  private async settle(
    input: AiQuotaSettlement,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Serialize settlement with new reservations for this organization.
      await tx
        .select({
          id: aiUsageQuotas.id,
        })
        .from(aiUsageQuotas)
        .where(
          eq(
            aiUsageQuotas.organizationId,
            input.organizationId,
          ),
        )
        .for("update")
        .limit(1);

      const conditions = and(
        eq(
          aiUsageReservations.id,
          input.reservationId,
        ),
        eq(
          aiUsageReservations.organizationId,
          input.organizationId,
        ),
      );

      if (input.outcome === "release") {
        await tx
          .delete(aiUsageReservations)
          .where(conditions);

        return;
      }

      const [reservation] = await tx
        .select({
          periodStart: aiUsageReservations.periodStart,
        })
        .from(aiUsageReservations)
        .where(conditions)
        .limit(1);

      if (!reservation) {
        return;
      }

      const periodEnd = new Date(
        Date.UTC(
          reservation.periodStart.getUTCFullYear(),
          reservation.periodStart.getUTCMonth() + 1,
          1,
          0,
          0,
          0,
          0,
        ),
      );

      await tx
        .update(aiUsageReservations)
        .set({
          expiresAt: periodEnd,
        })
        .where(conditions);
    });
  }
}
