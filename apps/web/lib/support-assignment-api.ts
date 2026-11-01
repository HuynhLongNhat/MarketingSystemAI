
import { apiFetch } from "./api-client";

export type SupportAssignment = {
  organizationId: string;
  agentId: string | null;
  agentName: string | null;
  agentStatus: string | null;
  mode: "automatic" | "assigned";
  updatedAt: string | null;
};

const PATH = "/customer-support/assignment";

export const supportAssignmentApi = {
  getCurrent() {
    return apiFetch<SupportAssignment>(PATH);
  },

  assign(agentId: string) {
    return apiFetch<SupportAssignment>(PATH, {
      method: "PUT",
      body: JSON.stringify({ agentId }),
    });
  },

  remove() {
    return apiFetch<SupportAssignment>(PATH, {
      method: "DELETE",
    });
  },
};
