
import { apiFetch } from "./api-client";

export type HandoffFilter = "all" | "unassigned" | "mine";

export interface HandoffQueueItem {
  id: string;
  organizationId: string;
  status: "escalated";
  assignedToUserId: string | null;
  assignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contactSession: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  assignee: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export const handoffApi = {
  listQueue(filter: HandoffFilter = "all") {
    const params = new URLSearchParams({ filter });

    return apiFetch<HandoffQueueItem[]>(
      `/conversations/handoff/queue?${params.toString()}`,
    );
  },

  claim(conversationId: string) {
    return apiFetch<HandoffQueueItem>(
      `/conversations/${encodeURIComponent(conversationId)}/claim`,
      { method: "POST" },
    );
  },

  assign(conversationId: string, userId: string) {
    return apiFetch<HandoffQueueItem>(
      `/conversations/${encodeURIComponent(conversationId)}/assignee`,
      {
        method: "POST",
        body: JSON.stringify({ userId }),
      },
    );
  },

  release(conversationId: string) {
    return apiFetch<HandoffQueueItem>(
      `/conversations/${encodeURIComponent(conversationId)}/assignee`,
      { method: "DELETE" },
    );
  },

  listMembers() {
    return apiFetch<OrganizationMember[]>(
      "/organizations/current/members",
    );
  },
};
