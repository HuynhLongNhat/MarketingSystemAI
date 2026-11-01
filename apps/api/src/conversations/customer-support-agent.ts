
import { aiAgents, db } from "@workspace/db/node";
import { and, asc, eq, inArray } from "drizzle-orm";

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
 * Tìm nhân viên CSKH đang hoạt động trong đúng tổ chức.
 *
 * Không lựa chọn Agent theo tên hoặc thời gian tạo,
 * vì những tiêu chí đó dễ dẫn đến chạy sai Agent.
 *
 * Giai đoạn MVP chỉ cho phép một Agent CSKH active
 * trong mỗi tổ chức.
 */
export async function resolveCustomerSupportAgent(
  organizationId: string,
): Promise<CustomerSupportAgentResolution> {
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
    agent: {
      id: agent.id,
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      connectionId: agent.connectionId,
      modelId: agent.modelId,
    },
  };
}
