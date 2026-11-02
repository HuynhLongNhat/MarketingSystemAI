
import { apiFetch } from "./api-client";

export interface OfficeDeskAssignment {
  id: string;
  organizationId: string;
  agentId: string;
  deskId: string;
  agentName: string;
  agentStatus: "draft" | "active" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
}

export const officeApi = {
  listAssignments() {
    return apiFetch<OfficeDeskAssignment[]>(
      "/office/assignments",
    );
  },

  assignDesk(deskId: string, agentId: string) {
    return apiFetch<OfficeDeskAssignment>(
      `/office/desks/${encodeURIComponent(deskId)}`,
      {
        method: "PUT",
        body: JSON.stringify({ agentId }),
      },
    );
  },

  unassignDesk(deskId: string) {
    return apiFetch<{
      success: boolean;
      deskId: string;
      agentId: string | null;
    }>(
      `/office/desks/${encodeURIComponent(deskId)}`,
      { method: "DELETE" },
    );
  },
};
