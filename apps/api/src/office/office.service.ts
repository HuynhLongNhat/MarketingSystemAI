
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";

import {
  aiAgents,
  db,
  officeDeskAssignments,
} from "@workspace/db/node";

import type { RequestContext } from "../auth/request-context.js";

const VALID_DESK_IDS = new Set([
  "desk-01",
  "desk-02",
  "desk-03",
  "desk-04",
  "desk-05",
  "desk-06",
]);

function getDatabaseErrorCode(
  error: unknown,
): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as {
    code?: unknown;
    cause?: unknown;
  };

  if (typeof candidate.code === "string") {
    return candidate.code;
  }

  return getDatabaseErrorCode(candidate.cause);
}

@Injectable()
export class OfficeService {
  private validateDeskId(deskId: string): void {
    if (!VALID_DESK_IDS.has(deskId)) {
      throw new BadRequestException(
        `Invalid office desk: ${deskId}`,
      );
    }
  }

  async listAssignments(context: RequestContext) {
    return db
      .select({
        id: officeDeskAssignments.id,
        organizationId:
          officeDeskAssignments.organizationId,
        deskId: officeDeskAssignments.deskId,
        agentId: officeDeskAssignments.agentId,
        agentName: aiAgents.name,
        agentStatus: aiAgents.status,
        createdAt: officeDeskAssignments.createdAt,
        updatedAt: officeDeskAssignments.updatedAt,
      })
      .from(officeDeskAssignments)
      .innerJoin(
        aiAgents,
        and(
          eq(
            aiAgents.id,
            officeDeskAssignments.agentId,
          ),
          eq(
            aiAgents.organizationId,
            officeDeskAssignments.organizationId,
          ),
        ),
      )
      .where(
        eq(
          officeDeskAssignments.organizationId,
          context.organizationId,
        ),
      )
      .orderBy(asc(officeDeskAssignments.deskId));
  }

  async assignDesk(
    context: RequestContext,
    deskId: string,
    agentId: string,
  ) {
    this.validateDeskId(deskId);

    const [agent] = await db
      .select({
        id: aiAgents.id,
        status: aiAgents.status,
      })
      .from(aiAgents)
      .where(
        and(
          eq(aiAgents.id, agentId),
          eq(
            aiAgents.organizationId,
            context.organizationId,
          ),
        ),
      )
      .limit(1);

    if (!agent) {
      throw new NotFoundException(
        "AI agent not found in this organization",
      );
    }

    if (
      agent.status !== "active" &&
      agent.status !== "paused"
    ) {
      throw new BadRequestException(
        "Only active or paused agents can be assigned to an office desk",
      );
    }

    try {
      const [assignment] = await db
        .insert(officeDeskAssignments)
        .values({
          id: randomUUID(),
          organizationId: context.organizationId,
          agentId,
          deskId,
        })
        .onConflictDoUpdate({
          target: [
            officeDeskAssignments.organizationId,
            officeDeskAssignments.agentId,
          ],
          set: {
            deskId,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (!assignment) {
        throw new ConflictException(
          "Office desk assignment failed",
        );
      }

      return assignment;
    } catch (error) {
      if (getDatabaseErrorCode(error) === "23505") {
        throw new ConflictException(
          "This desk is already occupied by another agent",
        );
      }

      if (getDatabaseErrorCode(error) === "23503") {
        throw new ConflictException(
          "Agent or organization is no longer available",
        );
      }

      throw error;
    }
  }

  async unassignDesk(
    context: RequestContext,
    deskId: string,
  ) {
    this.validateDeskId(deskId);

    const [deleted] = await db
      .delete(officeDeskAssignments)
      .where(
        and(
          eq(
            officeDeskAssignments.organizationId,
            context.organizationId,
          ),
          eq(officeDeskAssignments.deskId, deskId),
        ),
      )
      .returning({
        agentId: officeDeskAssignments.agentId,
      });

    return {
      success: true,
      deskId,
      agentId: deleted?.agentId ?? null,
    };
  }
}
