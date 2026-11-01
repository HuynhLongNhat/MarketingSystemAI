
import {
  aiAgents,
  customerSupportAssignments,
  db,
} from "@workspace/db/node";
import {
  and,
  asc,
  eq,
  inArray,
} from "drizzle-orm";

export type CustomerSupportAgentConfig = {
  id: string;
  name: string;
  systemPrompt: string;
  connectionId: string | null;
  modelId: string | null;
};

export type CustomerSupportAgentResolution =
  | { kind: "none" }
  | {
      kind: "selected";
      agent: CustomerSupportAgentConfig;
    }
  | { kind: "ambiguous" };

const SUPPORT_ROLES = [
  "customer_support",
  "customer-support",
];

/**
 * Quy tắc:
 *
 * 1. Nếu đã gán Agent chính thức:
 *    - Chỉ chọn Agent đó.
 *    - Bắt buộc đúng Organization, role và active.
 *    - Nếu không còn khả dụng, chặn AI thay vì
 *      âm thầm chuyển sang Agent khác.
 *
 * 2. Nếu chưa gán:
 *    - Tương thích cơ chế MVP cũ.
 *    - 0 active Agent: dùng Model Default.
 *    - 1 active Agent: sử dụng Agent đó.
 *    - Nhiều active Agent: từ chối chọn ngẫu nhiên.
 */
export async function resolveCustomerSupportAgent(
  organizationId: string,
): Promise<CustomerSupportAgentResolution> {
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

  if (assignment) {
    const [agent] = await db
      .select({
        id: aiAgents.id,
        name: aiAgents.name,
        systemPrompt: aiAgents.systemPrompt,
        connectionId: aiAgents.connectionId,
        modelId: aiAgents.modelId,
      })
      .from(aiAgents)
      .where(
        and(
          eq(aiAgents.id, assignment.agentId),
          eq(aiAgents.organizationId, organizationId),
          eq(aiAgents.status, "active"),
          inArray(aiAgents.role, SUPPORT_ROLES),
        ),
      )
      .limit(1);

    if (!agent) {
      // Giữ tương thích với interface xử lý lỗi hiện có.
      // Không fallback sang một Agent ngoài ý muốn.
      return { kind: "ambiguous" };
    }

    return {
      kind: "selected",
      agent,
    };
  }

  const agents = await db
    .select({
      id: aiAgents.id,
      name: aiAgents.name,
      systemPrompt: aiAgents.systemPrompt,
      connectionId: aiAgents.connectionId,
      modelId: aiAgents.modelId,
    })
    .from(aiAgents)
    .where(
      and(
        eq(aiAgents.organizationId, organizationId),
        eq(aiAgents.status, "active"),
        inArray(aiAgents.role, SUPPORT_ROLES),
      ),
    )
    .orderBy(asc(aiAgents.id))
    .limit(2);

  if (agents.length === 0) {
    return { kind: "none" };
  }

  if (agents.length > 1) {
    return { kind: "ambiguous" };
  }

  const agent = agents[0];

  if (!agent) {
    return { kind: "none" };
  }

  return {
    kind: "selected",
    agent,
  };
}
