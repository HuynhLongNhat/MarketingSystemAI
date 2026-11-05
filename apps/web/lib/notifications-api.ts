import { apiFetch } from "./api-client";

export type NotificationType =
  | "conversation_escalated"
  | "conversation_assigned";

export interface AppNotification {
  id: string;
  organizationId: string;
  recipientUserId: string;
  conversationId: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  items: AppNotification[];
  unreadCount: number;
}

export const notificationsApi = {
  list(limit = 30) {
    const params = new URLSearchParams({
      limit: String(limit),
    });

    return apiFetch<NotificationsResponse>(
      `/notifications?${params.toString()}`,
    );
  },

  markRead(notificationId: string) {
    return apiFetch<{ success: boolean }>(
      `/notifications/${encodeURIComponent(notificationId)}/read`,
      { method: "PATCH" },
    );
  },

  markAllRead() {
    return apiFetch<{ success: boolean }>(
      "/notifications/read-all",
      { method: "PATCH" },
    );
  },
};