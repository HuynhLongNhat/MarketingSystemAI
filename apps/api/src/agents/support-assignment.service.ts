
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  aiAgents,
  customerSupportAssignments,
  db,
} from "@workspace/db/node";
import { and, eq } from "drizzle-orm";

import type { RequestContext } from "../auth/request-context.js";

const SUPPORT_ROLES = [
  "customer_support",
  "customer-support",
];

@Injectable()
export class SupportAssignmentService {
  async getCurrent(context: RequestContext) {
    const [assignment] = await db
      .select({
        agentId: customerSupportAssignments.agentId,
        updatedAt: customerSupportAssignments.updatedAt,
      })
      .from(customerSupportAssignments)
      .where(
        eq(
          customerSupportAssignments.organizationId,
          context.organizationId,
        ),
      )
      .limit(1);

    if (!assignment) {
      return {
        organizationId: context.organizationId,
        agentId: null,
        agentName: null,
        agentStatus: null,
        mode: "automatic" as const,
        updatedAt: null,
      };
    }

    const [agent] = await db
      .select({
        name: aiAgents.name,
        status: aiAgents.status,
      })
      .from(aiAgents)
      .where(
        and(
          eq(aiAgents.id, assignment.agentId),
          eq(aiAgents.organizationId, context.organizationId),
        ),
      )
      .limit(1);

    return {
      organizationId: context.organizationId,
      agentId: assignment.agentId,
      agentName: agent?.name ?? null,
      agentStatus: agent?.status ?? null,
      mode: "assigned" as const,
      updatedAt: assignment.updatedAt,
    };
  }

  async assign(
    context: RequestContext,
    agentId: string,
  ) {
    const [agent] = await db
      .select({
        id: aiAgents.id,
        role: aiAgents.role,
        status: aiAgents.status,
      })
      .from(aiAgents)
      .where(
        and(
          eq(aiAgents.id, agentId),
          eq(aiAgents.organizationId, context.organizationId),
        ),
      )
      .limit(1);

    if (!agent) {
      throw new NotFoundException(
        "Không tìm thấy nhân viên AI trong tổ chức.",
      );
    }

    if (!SUPPORT_ROLES.includes(agent.role)) {
      throw new BadRequestException(
        "Chỉ có thể gán nhân viên AI chăm sóc khách hàng.",
      );
    }

    if (agent.status !== "active") {
      throw new BadRequestException(
        "Nhân viên CSKH phải ở trạng thái hoạt động.",
      );
    }

    await db
      .insert(customerSupportAssignments)
      .values({
        organizationId: context.organizationId,
        agentId: agent.id,
      })
      .onConflictDoUpdate({
        target: customerSupportAssignments.organizationId,
        set: {
          agentId: agent.id,
          updatedAt: new Date(),
        },
      });

    return this.getCurrent(context);
  }

  async remove(context: RequestContext) {
    await db
      .delete(customerSupportAssignments)
      .where(
        eq(
          customerSupportAssignments.organizationId,
          context.organizationId,
        ),
      );

    return this.getCurrent(context);
  }

  /**
   * Chỉ sử dụng nhân viên đã được gán nếu còn active
   * và thuộc đúng tổ chức.
   *
   * Trả về null khi chưa cấu hình, để dùng cơ chế cũ.
   */
  async getAssignedAgentId(
    organizationId: string,
  ): Promise<string | null> {
    const [assignment] = await db
      .select({
        agentId: customerSupportAssignments.agentId,
      })
      .from(customerSupportAssignments)
      .where(
        eq(
          customerSupportAssignments.organizationId,
          organizationId,
        ),
      )
      .limit(1);

    return assignment?.agentId ?? null;
  }
}
